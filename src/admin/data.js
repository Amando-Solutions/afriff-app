// Reading and writing festival data in the database.
// Admins save straight to the live data. Editors' saves become "changes"
// that wait for an admin to approve them (enforced by firestore.rules too).
import { useEffect, useState } from 'react';
import {
  addDoc, collection, doc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { seedData } from './schema.js';
import { REPLACED_LINKS, REPLACED_VALUES } from '../data/events.js';
import { FESTIVAL } from '../data/programme.js';

// Live list of one collection, e.g. useCollection('films')
export function useCollection(name) {
  const [state, setState] = useState({ items: null, error: '' });
  useEffect(() => {
    if (!name) return undefined; // nothing to load (saves database reads)
    return onSnapshot(
      collection(db, name),
      (snap) => setState({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: '' }),
      (e) => setState({ items: [], error: e.message })
    );
  }, [name]);
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

// Copy the built-in festival data (from afriff.com) into the database (admins only).
// SAFE TO RE-RUN:
//  - adds items that aren't in the database yet
//  - for items already there, only adds fields they don't have at all
//    (e.g. a newly introduced "logo" field). A field your team filled in or
//    cleared is never changed.
const REPLACED = new Set(REPLACED_LINKS);

export async function importAll(onProgress) {
  const seed = seedData();
  const added = {};
  const kept = {};
  let filled = 0;
  const writes = [];
  for (const [col, rows] of Object.entries(seed)) {
    const existing = new Map((await getDocs(collection(db, col))).docs.map((d) => [d.id, d.data()]));
    added[col] = 0;
    kept[col] = 0;
    for (const [id, data] of rows) {
      const current = existing.get(id);
      if (!current) {
        added[col] += 1;
        writes.push({ col, id, data, merge: false });
        continue;
      }
      kept[col] += 1;
      const newFields = Object.fromEntries(Object.entries(data).filter(([k, v]) => (
        (!(k in current) && v !== undefined && v !== '')
        // an old link we shipped (never one the team typed) gets the new file
        || (REPLACED.has(current[k]) && v && v !== current[k])
        // a corrected value, only while the database still has our old one
        || (col === 'events' && k in (REPLACED_VALUES[id] || {}) && current[k] === REPLACED_VALUES[id][k] && v !== current[k])
      )));
      // corrected values we now leave empty (e.g. a bio for the old speaker)
      if (col === 'events') {
        for (const [k, old] of Object.entries(REPLACED_VALUES[id] || {})) {
          if (!(k in data) && current[k] === old) newFields[k] = '';
        }
      }
      if (Object.keys(newFields).length) {
        filled += Object.keys(newFields).length;
        writes.push({ col, id, data: newFields, merge: true });
      }
    }
  }
  // the database accepts up to 500 writes at once; send them in chunks
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    writes.slice(i, i + 400).forEach(({ col, id, data, merge }) => batch.set(doc(db, col, id), data, { merge }));
    await batch.commit();
    onProgress?.(Math.min(i + 400, writes.length), writes.length);
  }
  return { added, kept, filled };
}

// Everything in the database as one file, for a backup on your laptop.
export const BACKUP_COLLECTIONS = ['films', 'screenings', 'events', 'venues', 'news', 'sponsors', 'jury', 'howToAttend'];
export async function downloadBackup() {
  const out = { exportedAt: new Date().toISOString(), project: 'afriff-app' };
  for (const col of BACKUP_COLLECTIONS) {
    const snap = await getDocs(collection(db, col));
    out[col] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
  }
  // live queue counts: one record per venue per festival day (date/venue keys)
  out.queues = {};
  for (const day of FESTIVAL.days) {
    const snap = await getDocs(collection(db, 'queueDays', day, 'venues'));
    snap.docs.forEach((d) => { out.queues[`${day}/${d.id}`] = d.data(); });
  }
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `afriff-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return Object.fromEntries([...BACKUP_COLLECTIONS, 'queues'].map((c) => [c, Object.keys(out[c]).length]));
}
