// Admins: copy the current festival data into ONE published bundle
// (published/current) that the attendee app downloads. Nothing reaches
// attendees until this is pressed.
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { COLLECTION_ORDER } from './schema.js';

const MAX_BYTES = 900 * 1024; // the database allows 1 MB per document

export async function publishToApp(profile) {
  const snapshot = { version: Date.now(), publishedAt: new Date().toISOString() };
  const counts = {};
  for (const col of COLLECTION_ORDER) {
    const snap = await getDocs(collection(db, col));
    snapshot[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    counts[col] = snapshot[col].length;
  }
  const json = JSON.stringify(snapshot);
  if (json.length > MAX_BYTES) throw new Error(`The festival data is too big to publish in one go (${Math.round(json.length / 1024)} KB). Ask Claude to split it.`);
  await setDoc(doc(db, 'published', 'current'), {
    version: snapshot.version, json, counts,
    publishedAt: serverTimestamp(), publishedBy: profile.id, publishedByName: profile.name || profile.email,
  });
  return counts;
}
