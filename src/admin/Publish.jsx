import { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Send } from 'lucide-react';
import { db } from './firebase.js';
import { COLLECTION_ORDER, COLLECTIONS } from './schema.js';

// Admins: copy the current festival data into ONE published bundle
// (published/current) that the attendee app downloads. Nothing reaches
// attendees until this is pressed.
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

const when = (ts) => (ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '');

export default function Publish({ profile }) {
  const [current, setCurrent] = useState(undefined);
  const [state, setState] = useState({ busy: false, done: null, error: '' });

  useEffect(
    () =>
      onSnapshot(
        doc(db, 'published', 'current'),
        (snap) => setCurrent(snap.exists() ? snap.data() : null),
        (e) => setState((s) => ({ ...s, error: e.message }))
      ),
    []
  );

  const run = async () => {
    if (!window.confirm('Publish the current festival data to the attendee app? Everyone will see it within about a minute.')) return;
    setState({ busy: true, done: null, error: '' });
    try {
      setState({ busy: false, done: await publishToApp(profile), error: '' });
    } catch (e) {
      setState({ busy: false, done: null, error: e.message });
    }
  };

  return (
    <div className="ad-page">
      <h1 className="ad-title">Publish to app</h1>
      <p className="muted">
        Edits and approved changes are saved in the database straight away, but attendees only see them after an admin publishes.
        Make your edits, check them, then publish. Phones pick it up within about a minute, or the next time the app is opened.
      </p>

      <div className="ad-card ad-import">
        {current === undefined && <p className="muted">Checking…</p>}
        {current === null && <p className="ad-info">Nothing has been published yet. The attendee app is showing its built-in copy.</p>}
        {current && (
          <p className="muted small">
            Last published {when(current.publishedAt)} by {current.publishedByName}:{' '}
            {Object.entries(current.counts || {}).map(([k, n]) => `${n} ${(COLLECTIONS[k]?.title || k).toLowerCase()}`).join(', ')}.
          </p>
        )}
        <button type="button" className="btn btn-gold" onClick={run} disabled={state.busy}>
          <Send size={18} /> {state.busy ? 'Publishing…' : 'Publish to app'}
        </button>
        {state.done && <p className="ad-note">Published. Attendees will see it within about a minute.</p>}
        {state.error && <p className="ad-error">Couldn't publish: {state.error}</p>}
      </div>
    </div>
  );
}
