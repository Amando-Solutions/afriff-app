import { useEffect, useState } from 'react';
import { doc, increment, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import { db } from './firebase.js';
import { useCollection } from './data.js';
import { FESTIVAL } from '../data/programme.js';
import { dayLabel, queueLabel, timeLabel } from '../lib/format.js';
import { lagosDate } from '../lib/now.js';

// Door volunteers: today's screenings at their venue, then big +1 / −1
// buttons for "people in line" and "seats left".
// Counts are stored in queues/{screeningId}. Each tap sends "add 1" or
// "take 1 away" (not a fixed number), so two volunteers at the same door
// never overwrite each other. Taps made without signal are kept on the
// phone and sent when it reconnects.

const ago = (ts) => {
  if (!ts?.seconds) return '';
  const m = Math.round((Date.now() - ts.seconds * 1000) / 60000);
  return m <= 0 ? 'just now' : `${m} min ago`;
};

function Counter({ label, value, onChange, max }) {
  return (
    <div className="door-counter">
      <span className="door-counter-label">{label}</span>
      <span className="door-counter-value">{value}</span>
      <div className="door-buttons">
        <button type="button" className="door-btn minus" onClick={() => onChange(-1)} disabled={value <= 0} aria-label={`${label}: take away 1`}>
          <Minus size={36} strokeWidth={3} />
        </button>
        <button type="button" className="door-btn plus" onClick={() => onChange(1)} disabled={max != null && value >= max} aria-label={`${label}: add 1`}>
          <Plus size={36} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

function Screening({ screening, film, venueName, profile, onBack }) {
  const ref = doc(db, 'queues', screening.id);
  const [q, setQ] = useState({ data: null, pending: false, loaded: false, error: '' });

  useEffect(
    () =>
      onSnapshot(
        ref,
        { includeMetadataChanges: true }, // so we know when taps are still waiting to send
        (snap) => setQ({ data: snap.exists() ? snap.data() : null, pending: snap.metadata.hasPendingWrites, loaded: true, error: '' }),
        (e) => setQ((s) => ({ ...s, loaded: true, error: e.message }))
      ),
    [screening.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const who = { updatedAt: serverTimestamp(), updatedBy: profile.id, updatedByName: profile.name || profile.email };
  const start = () =>
    setDoc(ref, { inLine: 0, seatsLeft: screening.capacity || 0, venue: screening.venue, date: screening.date, ...who })
      .catch((e) => setQ((s) => ({ ...s, error: e.message })));
  const bump = (field, by) =>
    setDoc(ref, { [field]: increment(by), ...who }, { merge: true }).catch((e) => setQ((s) => ({ ...s, error: e.message })));

  const inLine = Math.max(0, q.data?.inLine ?? 0);
  const seatsLeft = Math.max(0, q.data?.seatsLeft ?? 0);
  const label = q.data ? queueLabel({ inLine, seatsLeft }) : null;

  return (
    <div className="door">
      <button type="button" className="ad-back door-back" onClick={onBack}><ChevronLeft size={18} /> All screenings</button>
      <div className="door-head">
        <span className="door-time">{timeLabel(screening.time)} · {screening.screen}</span>
        <h1 className="door-title">{film?.title || screening.film}</h1>
        <span className="muted small">{venueName} · {screening.capacity} seats</span>
      </div>

      {!q.loaded && <p className="muted">Loading…</p>}
      {q.error && <p className="ad-error">Couldn't save: {q.error}</p>}

      {q.loaded && !q.data && (
        <div className="ad-card door-start">
          <p>No count yet for this screening. Start when the queue opens.</p>
          <button type="button" className="btn btn-gold door-start-btn" onClick={start}>Start counting</button>
          <p className="muted small">Starts at 0 in line and {screening.capacity} seats left.</p>
        </div>
      )}

      {q.data && (
        <>
          <div className="door-status">
            {label && <span className={`label tone-${label.tone}`}>{label.text}</span>}
            <span className="muted small">
              {q.pending ? 'Saving… (will send when you have signal)' : `Saved · ${ago(q.data.updatedAt)}${q.data.updatedByName ? ` by ${q.data.updatedByName}` : ''}`}
            </span>
          </div>
          <Counter label="People in line" value={inLine} onChange={(by) => bump('inLine', by)} />
          <Counter label="Seats left" value={seatsLeft} onChange={(by) => bump('seatsLeft', by)} max={screening.capacity} />
          <button type="button" className="btn btn-outline door-full" onClick={() => setDoc(ref, { seatsLeft: 0, ...who }, { merge: true }).catch((e) => setQ((s) => ({ ...s, error: e.message })))} disabled={seatsLeft === 0}>
            Mark as full (0 seats)
          </button>
        </>
      )}
    </div>
  );
}

export default function DoorCounter({ profile }) {
  const screenings = useCollection('screenings');
  const films = useCollection('films');
  const venues = useCollection('venues');
  const isAdmin = profile.role === 'admin';
  const today = lagosDate();
  const [venue, setVenue] = useState(isAdmin ? '' : profile.venue);
  const [day, setDay] = useState(FESTIVAL.days.includes(today) ? today : FESTIVAL.days[0]);
  const [openId, setOpenId] = useState(null);

  if (!isAdmin && !profile.venue) {
    return (
      <div className="ad-page">
        <h1 className="ad-title">Door counter</h1>
        <p className="ad-info">You don't have a venue yet. Ask an admin to set your venue on the Team page.</p>
      </div>
    );
  }

  // volunteers only ever see today; admins can look at any festival day
  const shownDay = isAdmin ? day : today;
  const list = (screenings.items || [])
    .filter((s) => s.date === shownDay && (!venue || s.venue === venue))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const open = list.find((s) => s.id === openId);
  const venueName = (id) => venues.map[id]?.name || id;

  if (open) {
    return (
      <div className="ad-page">
        <Screening screening={open} film={films.map[open.film]} venueName={venueName(open.venue)} profile={profile} onBack={() => setOpenId(null)} />
      </div>
    );
  }

  return (
    <div className="ad-page">
      <h1 className="ad-title">Door counter</h1>
      <p className="muted">
        {isAdmin ? 'Pick a venue and day.' : `${venueName(profile.venue)} · ${dayLabel(today)}`} Tap a screening to count its queue.
      </p>

      {isAdmin && (
        <div className="door-pickers">
          <select value={venue} onChange={(e) => setVenue(e.target.value)} aria-label="Venue">
            <option value="">All venues</option>
            {(venues.items || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day">
            {FESTIVAL.days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
          </select>
        </div>
      )}

      {screenings.items == null && <p className="muted">Loading…</p>}
      {screenings.items?.length === 0 && <p className="ad-info">No screenings in the database yet. An admin needs to load the festival data first (Festival data page).</p>}
      {screenings.items?.length > 0 && list.length === 0 && (
        <p className="muted">{isAdmin ? 'No screenings for this venue and day.' : 'No screenings at your venue today.'}</p>
      )}

      <div className="ad-rows">
        {list.map((s) => (
          <button key={s.id} type="button" className="ad-row door-row" onClick={() => setOpenId(s.id)}>
            <span className="door-row-time">{timeLabel(s.time)}</span>
            <span className="ad-row-text">
              <span className="ad-row-title">{films.map[s.film]?.title || s.film}</span>
              <span className="muted small">{venueName(s.venue)} · {s.screen}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
