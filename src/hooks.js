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

export function useConcepts() {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    const q = query(collection(db, 'concepts'), orderBy('startDate', 'desc'));
    return onSnapshot(q, (snap) => {
      setConcepts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

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
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    updatedAt: serverTimestamp(),
    updatedBy: uid,
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
  await addDoc(collection(db, 'assignments'), {
    conceptId,
    title: data.title.trim(),
    link: (data.link || '').trim(),
    note: (data.note || '').trim(),
    date: data.date,
    linkMode: data.linkMode || 'required',
    noteMode: data.noteMode || 'optional',
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function updateAssignment(assignmentId, data) {
  await updateDoc(doc(db, 'assignments', assignmentId), {
    title: data.title.trim(),
    link: (data.link || '').trim(),
    note: (data.note || '').trim(),
    date: data.date,
    linkMode: data.linkMode || 'required',
    noteMode: data.noteMode || 'optional',
    updatedAt: serverTimestamp(),
  });
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
    await setDoc(doc(db, 'completions', id), {
      assignmentId,
      userId,
      done: false,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  await setDoc(doc(db, 'completions', id), {
    assignmentId,
    userId,
    done: true,
    solutionUrl: (submissionData.solutionUrl || '').trim(),
    notes: (submissionData.notes || submissionData.keyInsight || '').trim(),
    updatedAt: serverTimestamp(),
  });
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
