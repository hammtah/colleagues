import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

export function useConcepts({ isModerator = false } = {}) {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    const q = query(collection(db, 'concepts'), orderBy('startDate', 'desc'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Regular users never see hidden concepts
      setConcepts(isModerator ? all : all.filter((c) => !c.hidden));
      setLoading(false);
    });
  }, [isModerator]);

  return { concepts, loading };
}

export function useAssignments(conceptId = null) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }

    let q;
    if (conceptId) {
      q = query(
        collection(db, 'assignments'),
        where('conceptId', '==', conceptId),
        orderBy('date', 'asc'),
      );
    } else {
      q = query(collection(db, 'assignments'), orderBy('date', 'desc'));
    }

    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        if (a.date !== b.date) {
          return conceptId ? (a.date < b.date ? -1 : 1) : (a.date > b.date ? -1 : 1);
        }
        const orderA = typeof a.order === 'number' ? a.order : 0;
        const orderB = typeof b.order === 'number' ? b.order : 0;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      setAssignments(docs);
      setLoading(false);
    });
  }, [conceptId]);

  return { assignments, loading };
}

export function useCompletions() {
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    return onSnapshot(collection(db, 'completions'), (snap) => {
      setCompletions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  return { completions, loading };
}

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  return { users, loading };
}

export function useComments(assignmentId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !assignmentId) {
      setComments([]);
      setLoading(false);
      return undefined;
    }
    const q = query(
      collection(db, 'assignments', assignmentId, 'comments'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [assignmentId]);

  return { comments, loading };
}

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  return { events, loading };
}

export async function createConcept(data, uid) {
  await addDoc(collection(db, 'concepts'), {
    title: data.title.trim(),
    description: data.description.trim(),
    startDate: data.startDate,
    endDate: data.endDate,
    imageUrl: (data.imageUrl || '').trim(),
    hidden: Boolean(data.hidden),
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function updateConcept(conceptId, data, uid) {
  await updateDoc(doc(db, 'concepts', conceptId), {
    title: data.title.trim(),
    description: data.description.trim(),
    startDate: data.startDate,
    endDate: data.endDate,
    imageUrl: (data.imageUrl || '').trim(),
    hidden: Boolean(data.hidden),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

export async function toggleConceptHidden(conceptId, currentlyHidden) {
  await updateDoc(doc(db, 'concepts', conceptId), {
    hidden: !currentlyHidden,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteConcept(conceptId) {
  const assignmentsSnap = await getDocs(
    query(collection(db, 'assignments'), where('conceptId', '==', conceptId)),
  );

  const batch = writeBatch(db);
  for (const assignmentDoc of assignmentsSnap.docs) {
    const commentsSnap = await getDocs(
      collection(db, 'assignments', assignmentDoc.id, 'comments'),
    );
    commentsSnap.docs.forEach((c) => batch.delete(c.ref));
    batch.delete(assignmentDoc.ref);
  }
  batch.delete(doc(db, 'concepts', conceptId));
  await batch.commit();
}

export async function createAssignment(data, conceptId, uid) {
  let order = 0;
  try {
    const snap = await getDocs(
      query(
        collection(db, 'assignments'),
        where('conceptId', '==', conceptId),
        where('date', '==', data.date)
      )
    );
    if (!snap.empty) {
      const orders = snap.docs.map((d) => d.data().order ?? 0);
      order = Math.max(...orders, -1) + 1;
    }
  } catch (err) {
    console.error('Failed to compute order for assignment:', err);
  }

  await addDoc(collection(db, 'assignments'), {
    conceptId,
    title: data.title.trim(),
    link: (data.link || '').trim(),
    note: (data.note || '').trim(),
    markdownContent: (data.markdownContent || '').trim(),
    date: data.date,
    linkMode: data.linkMode || 'required',
    noteMode: data.noteMode || 'optional',
    isOptional: Boolean(data.isOptional),
    order,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function updateAssignment(assignmentId, data) {
  await updateDoc(doc(db, 'assignments', assignmentId), {
    title: data.title.trim(),
    link: (data.link || '').trim(),
    note: (data.note || '').trim(),
    markdownContent: (data.markdownContent || '').trim(),
    date: data.date,
    linkMode: data.linkMode || 'required',
    noteMode: data.noteMode || 'optional',
    isOptional: Boolean(data.isOptional),
    updatedAt: serverTimestamp(),
  });
}

export async function reorderAssignments(orderedAssignments) {
  if (!db || !orderedAssignments || orderedAssignments.length === 0) return;
  const batch = writeBatch(db);
  orderedAssignments.forEach((assignment, index) => {
    const ref = doc(db, 'assignments', assignment.id);
    batch.update(ref, { order: index });
  });
  await batch.commit();
}

export async function deleteAssignment(assignmentId) {
  const commentsSnap = await getDocs(
    collection(db, 'assignments', assignmentId, 'comments'),
  );
  const batch = writeBatch(db);
  commentsSnap.docs.forEach((c) => batch.delete(c.ref));
  batch.delete(doc(db, 'assignments', assignmentId));
  await batch.commit();
}

export async function setCompletion(assignmentId, userId, done, submissionData = {}) {
  const id = `${assignmentId}_${userId}`;
  if (!done) {
    await setDoc(
      doc(db, 'completions', id),
      {
        assignmentId,
        userId,
        done: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }
  await setDoc(
    doc(db, 'completions', id),
    {
      assignmentId,
      userId,
      done: true,
      solutionUrl: (submissionData.solutionUrl || '').trim(),
      notes: (submissionData.notes || submissionData.keyInsight || '').trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function toggleReaction(completionId, emoji, userId, currentReactions = {}) {
  const ALL_EMOJIS = ['🧠', '👍', '🔥'];
  const existingEmoji = ALL_EMOJIS.find((e) => (currentReactions[e] || []).includes(userId));

  if (existingEmoji === emoji) {
    // User clicked their existing reaction -> remove it
    await updateDoc(doc(db, 'completions', completionId), {
      [`reactions.${emoji}`]: arrayRemove(userId),
    });
  } else if (existingEmoji) {
    // User clicked a new reaction -> remove old reaction and add new reaction
    await updateDoc(doc(db, 'completions', completionId), {
      [`reactions.${existingEmoji}`]: arrayRemove(userId),
      [`reactions.${emoji}`]: arrayUnion(userId),
    });
  } else {
    // User had no reaction -> add reaction
    await updateDoc(doc(db, 'completions', completionId), {
      [`reactions.${emoji}`]: arrayUnion(userId),
    });
  }
}

export async function addComment(assignmentId, userId, text) {
  await addDoc(collection(db, 'assignments', assignmentId, 'comments'), {
    userId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function deleteComment(assignmentId, commentId) {
  await deleteDoc(doc(db, 'assignments', assignmentId, 'comments', commentId));
}

export async function createEvent(data, uid) {
  await addDoc(collection(db, 'events'), {
    title: data.title.trim(),
    type: data.type,
    date: data.date,
    description: (data.description || '').trim(),
    rsvps: [],
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function toggleRsvp(eventId, userId, going) {
  await updateDoc(doc(db, 'events', eventId), {
    rsvps: going ? arrayUnion(userId) : arrayRemove(userId),
  });
}

export async function deleteEvent(eventId) {
  await deleteDoc(doc(db, 'events', eventId));
}
