// Reading and writing festival data in the database.
// Admins save straight to the live data. Editors' saves become "changes"
// that wait for an admin to approve them (enforced by firestore.rules too).
import { useEffect, useState } from 'react';
import {
  addDoc, collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { seedData } from './schema.js';

// Live list of one collection, e.g. useCollection('films')
export function useCollection(name) {
  const [state, setState] = useState({ items: null, error: '' });
  useEffect(
    () =>
      onSnapshot(
        collection(db, name),
        (snap) => setState({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: '' }),
        (e) => setState({ items: [], error: e.message })
      ),
    [name]
  );
  const map = Object.fromEntries((state.items || []).map((i) => [i.id, i]));
  return { ...state, map };
}

// Changes waiting for approval (admins) or one editor's own changes
export function useChanges({ pendingOnly, mineUid }) {
  const [state, setState] = useState({ items: null, error: '' });
  useEffect(() => {
    const q = pendingOnly
      ? query(collection(db, 'changes'), where('status', '==', 'pending'))
      : query(collection(db, 'changes'), where('submittedBy', '==', mineUid));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // newest first (sorted here, so no extra database index is needed)
        items.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        setState({ items, error: '' });
      },
      (e) => setState({ items: [], error: e.message })
    );
  }, [pendingOnly, mineUid]);
  return state;
}

// Save (create or update) one item. Returns 'saved' or 'submitted'.
export async function saveItem({ profile, col, id, data, before, summary }) {
  if (profile.role === 'admin') {
    const batch = writeBatch(db);
    batch.set(doc(db, col, id), data);
    await batch.commit();
    return 'saved';
  }
  await addDoc(collection(db, 'changes'), {
    collection: col, docId: id, action: before ? 'update' : 'create',
    data, before: before || null, summary,
    status: 'pending', submittedBy: profile.id, submittedByName: profile.name || profile.email,
    submittedAt: serverTimestamp(),
  });
  return 'submitted';
}

export async function deleteItem({ profile, col, id, before, summary }) {
  if (profile.role === 'admin') {
    const batch = writeBatch(db);
    batch.delete(doc(db, col, id));
    await batch.commit();
    return 'saved';
  }
  await addDoc(collection(db, 'changes'), {
    collection: col, docId: id, action: 'delete', data: null, before, summary,
    status: 'pending', submittedBy: profile.id, submittedByName: profile.name || profile.email,
    submittedAt: serverTimestamp(),
  });
  return 'submitted';
}

// Admin approves: apply the change to the live data and mark it approved, together.
export async function approveChange(change, admin) {
  const batch = writeBatch(db);
  const target = doc(db, change.collection, change.docId);
  if (change.action === 'delete') batch.delete(target);
  else batch.set(target, change.data);
  batch.update(doc(db, 'changes', change.id), {
    status: 'approved', reviewedBy: admin.id, reviewedByName: admin.name || admin.email, reviewedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function rejectChange(change, admin, note) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'changes', change.id), {
    status: 'rejected', note: note || '', reviewedBy: admin.id, reviewedByName: admin.name || admin.email, reviewedAt: serverTimestamp(),
  });
  await batch.commit();
}

// Copy all the built-in festival data into the database (admins only).
// Overwrites items with the same ID; leaves anything else alone.
export async function importAll(onProgress) {
  const seed = seedData();
  const writes = Object.entries(seed).flatMap(([col, rows]) => rows.map(([id, data]) => ({ col, id, data })));
  // the database accepts up to 500 writes at once; send them in chunks
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    writes.slice(i, i + 400).forEach(({ col, id, data }) => batch.set(doc(db, col, id), data));
    await batch.commit();
    onProgress?.(Math.min(i + 400, writes.length), writes.length);
  }
  return Object.fromEntries(Object.entries(seed).map(([col, rows]) => [col, rows.length]));
}
