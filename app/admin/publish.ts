// Admins: copy the current festival data into ONE published bundle
// (published/current) that the attendee app downloads. Nothing reaches
// attendees until this is pressed.
// Alongside it goes a tiny marker, published/version, which every open phone
// watches live: phones only download the big bundle when the marker says
// there's a newer version (lib/liveData.ts). Both are written together.
import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTION_ORDER } from './schema';
import type { Profile } from './types';

const MAX_BYTES = 900 * 1024; // the database allows 1 MB per document

export async function publishToApp(profile: Profile) {
  const snapshot: Record<string, unknown> & { version: number } = { version: Date.now(), publishedAt: new Date().toISOString() };
  const counts: Record<string, number> = {};
  for (const col of COLLECTION_ORDER) {
    const snap = await getDocs(collection(db, col));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    snapshot[col] = docs;
    counts[col] = docs.length;
  }
  const json = JSON.stringify(snapshot);
  if (json.length > MAX_BYTES) throw new Error(`The festival data is too big to publish in one go (${Math.round(json.length / 1024)} KB). Ask Claude to split it.`);
  const batch = writeBatch(db);
  batch.set(doc(db, 'published', 'current'), {
    version: snapshot.version, json, counts,
    publishedAt: serverTimestamp(), publishedBy: profile.id, publishedByName: profile.name || profile.email,
  });
  batch.set(doc(db, 'published', 'version'), { version: snapshot.version, publishedAt: serverTimestamp() });
  await batch.commit();
  return counts;
}
