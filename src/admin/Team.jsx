import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { ROLES } from './useAdminAuth.js';
import { VENUES } from '../data/programme.js';

// Admins only: everyone who has signed up, and what they're allowed to do.
export default function Team({ me }) {
  const [people, setPeople] = useState(null);
  const [error, setError] = useState('');

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'users'), orderBy('createdAt', 'desc')),
        (snap) => setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => setError(e.message)
      ),
    []
  );

  const save = async (person, changes) => {
    setError('');
    try {
      const next = { ...changes };
      // only door volunteers have a venue
      if (next.role && next.role !== 'volunteer') next.venue = null;
      await updateDoc(doc(db, 'users', person.id), next);
    } catch (e) {
      setError(`Couldn't save: ${e.message}`);
    }
  };

  const waiting = people?.filter((p) => p.role === 'pending').length || 0;

  return (
    <div className="ad-page">
      <h1 className="ad-title">Team</h1>
      <p className="muted">People sign up on the admin login page, then you choose what they can do here. Changes apply straight away.</p>
      {waiting > 0 && <p className="ad-banner">{waiting} {waiting === 1 ? 'person is' : 'people are'} waiting for access.</p>}
      {error && <p className="ad-error" role="alert">{error}</p>}
      {!people && !error && <p className="muted">Loading…</p>}

      <div className="ad-list">
        {people?.map((p) => {
          const isMe = p.id === me.id;
          return (
            <div key={p.id} className={`ad-person${p.role === 'pending' ? ' waiting' : ''}`}>
              <div className="ad-person-text">
                <span className="ad-person-name">{p.name || '(no name)'}{isMe ? ' · you' : ''}</span>
                <span className="muted small">{p.email}</span>
              </div>
              <div className="ad-person-controls">
                <select value={p.role} disabled={isMe} onChange={(e) => save(p, { role: e.target.value })} aria-label={`Role for ${p.name || p.email}`}>
                  {Object.entries(ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {p.role === 'volunteer' && (
                  <select value={p.venue || ''} onChange={(e) => save(p, { venue: e.target.value || null })} aria-label="Venue">
                    <option value="">Choose venue…</option>
                    {VENUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                )}
              </div>
              {isMe && <span className="muted small">You can't change your own role, so there's always an admin.</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
