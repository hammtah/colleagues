import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';

export function useConcept() {
  const [concept, setConcept] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    return onSnapshot(doc(db, 'concept', 'current'), (snap) => {
      setConcept(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
  }, []);

  return { concept, loading };
}

export function useAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    const q = query(collection(db, 'assignments'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

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

export async function saveConcept(data, uid) {
  await setDoc(
    doc(db, 'concept', 'current'),
    {
      title: data.title.trim(),
      description: data.description.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  );
}

export async function createAssignment(data, uid) {
  await addDoc(collection(db, 'assignments'), {
    title: data.title.trim(),
    link: data.link.trim(),
    note: (data.note || '').trim(),
    date: data.date,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function setCompletion(assignmentId, userId, done) {
  const id = `${assignmentId}_${userId}`;
  await setDoc(doc(db, 'completions', id), {
    assignmentId,
    userId,
    done,
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
