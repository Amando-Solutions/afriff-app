// Reading and writing festival data in the database.
// Admins save straight to the live data. Editors' saves become "changes"
// that wait for an admin to approve them (enforced by firestore.rules too).
import { computed, onBeforeUnmount, reactive, toValue, watch, type MaybeRefOrGetter } from 'vue';
import {
  addDoc, collection, doc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { seedData, type CollectionName } from './schema';
import { REPLACED_LINKS, REPLACED_VALUES } from '../data/events';
import { FESTIVAL } from '../data/programme';
import type { ChangeDoc, DataDoc, DocMap, Profile } from './types';

// Live list of one collection, e.g. useCollection('films').
// `name` can be a getter, and null means "nothing to load" (saves database reads).
export function useCollection(name: MaybeRefOrGetter<string | null>) {
  const state = reactive({ items: null as DataDoc[] | null, error: '' });
  let stop = () => {};
  watch(
    () => toValue(name),
    (n) => {
      stop();
      stop = () => {};
      if (!n) return;
      state.items = null;
      stop = onSnapshot(
        collection(db, n),
        (snap) => { state.items = snap.docs.map((d) => ({ id: d.id, ...d.data() })); state.error = ''; },
        (e) => { state.items = []; state.error = e.message; },
      );
    },
    { immediate: true },
  );
  onBeforeUnmount(() => stop());
  const map = computed<DocMap>(() => Object.fromEntries((state.items || []).map((i) => [i.id, i])));
  return { state, map };
}

// Changes waiting for approval (admins) or one editor's own changes
export function useChanges({ pendingOnly, mineUid }: { pendingOnly?: boolean; mineUid?: string }) {
  const state = reactive({ items: null as ChangeDoc[] | null, error: '' });
  const q = pendingOnly
    ? query(collection(db, 'changes'), where('status', '==', 'pending'))
    : query(collection(db, 'changes'), where('submittedBy', '==', mineUid));
  const stop = onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChangeDoc);
      // newest first (sorted here, so no extra database index is needed)
      items.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      state.items = items;
      state.error = '';
    },
    (e) => { state.items = []; state.error = e.message; },
  );
  onBeforeUnmount(stop);
  return state;
}

type Doc = Record<string, unknown>;
export type SaveResult = 'saved' | 'submitted';

// Save (create or update) one item. Returns 'saved' or 'submitted'.
export async function saveItem({ profile, col, id, data, before, summary }: {
  profile: Profile; col: string; id: string; data: Doc; before: Doc | null; summary: string;
}): Promise<SaveResult> {
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

export async function deleteItem({ profile, col, id, before, summary }: {
  profile: Profile; col: string; id: string; before: Doc | null; summary: string;
}): Promise<SaveResult> {
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
export async function approveChange(change: ChangeDoc, admin: Profile) {
  const batch = writeBatch(db);
  const target = doc(db, change.collection, change.docId);
  if (change.action === 'delete') batch.delete(target);
  else batch.set(target, change.data ?? {});
  batch.update(doc(db, 'changes', change.id), {
    status: 'approved', reviewedBy: admin.id, reviewedByName: admin.name || admin.email, reviewedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function rejectChange(change: ChangeDoc, admin: Profile, note: string) {
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

export interface ImportResult {
  added: Record<string, number>;
  kept: Record<string, number>;
  filled: number;
}

export async function importAll(onProgress?: (done: number, total: number) => void): Promise<ImportResult> {
  const seed = seedData();
  const added: Record<string, number> = {};
  const kept: Record<string, number> = {};
  let filled = 0;
  const writes: { col: string; id: string; data: Doc; merge: boolean }[] = [];
  for (const [col, rows] of Object.entries(seed) as [CollectionName, [string, Doc][]][]) {
    const existing = new Map<string, Doc>((await getDocs(collection(db, col))).docs.map((d) => [d.id, d.data()]));
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
      const corrected = (col === 'events' ? REPLACED_VALUES[id] : undefined) || {};
      const newFields: Doc = Object.fromEntries(Object.entries(data).filter(([k, v]) => (
        (!(k in current) && v !== undefined && v !== '')
        // an old link we shipped (never one the team typed) gets the new file
        || (typeof current[k] === 'string' && REPLACED.has(current[k] as string) && v && v !== current[k])
        // a corrected value, only while the database still has our old one
        || (k in corrected && current[k] === corrected[k as keyof typeof corrected] && v !== current[k])
      )));
      // corrected values we now leave empty (e.g. a bio for the old speaker)
      for (const [k, old] of Object.entries(corrected)) {
        if (!(k in data) && current[k] === old) newFields[k] = '';
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
export const BACKUP_COLLECTIONS = ['films', 'screenings', 'events', 'venues', 'news', 'sponsors', 'jury', 'howToAttend'] as const;
export async function downloadBackup(): Promise<Record<string, number>> {
  const collections: Record<string, Record<string, Doc>> = {};
  for (const col of BACKUP_COLLECTIONS) {
    const snap = await getDocs(collection(db, col));
    collections[col] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
  }
  // live queue counts: one record per venue per festival day (date/venue keys)
  const queues: Record<string, Doc> = {};
  for (const day of FESTIVAL.days) {
    const snap = await getDocs(collection(db, 'queueDays', day, 'venues'));
    snap.docs.forEach((d) => { queues[`${day}/${d.id}`] = d.data(); });
  }
  const out = { exportedAt: new Date().toISOString(), project: 'afriff-app', ...collections, queues };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `afriff-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ...Object.fromEntries(Object.entries(collections).map(([c, docs]) => [c, Object.keys(docs).length])), queues: Object.keys(queues).length };
}
