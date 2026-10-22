import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, increment, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import { db } from './firebase.js';
import { useCollection } from './data.js';
import { FESTIVAL } from '../data/programme.js';
import { dayLabel, queueLabel, timeLabel } from '../lib/format.js';
import { lagosDate } from '../lib/now.js';

// Door volunteers: today's screenings at their venue, then big +1 / −1
// buttons for "people in line" and "seats left".
//
// Counts live in ONE record per venue per day: queueDays/{date}/venues/{venue}
// with a map `s` of screeningId → { inLine, seatsLeft, updatedAt, byName }.
// Phones read those few records through the /api/queues relay.
//
// Taps show on screen at once and are sent in small bundles (one save per
// ~1 second of tapping) as "add N" / "take N away", never a fixed number,
// so two volunteers at the same door never overwrite each other and the
// free database plan's write limit isn't eaten up. Taps made without signal
// are kept on the phone and sent when it reconnects.

const SEND_AFTER_MS = 1000; // quiet time after the last tap before sending
const SEND_AT_MOST_MS = 2500; // keep tapping and it still sends this often

const ago = (ts) => {
  if (!ts?.seconds) return '';
  const m = Math.round((Date.now() - ts.seconds * 1000) / 60000);
  return m <= 0 ? 'just now' : `${m} min ago`;
};

const boardRef = (date, venue) => doc(db, 'queueDays', date, 'venues', venue);

// Live copy of one venue's record for one day (admins and volunteers)
function useBoard(date, venue) {
  const [b, setB] = useState({ data: null, pending: false, loaded: false, error: '' });
  useEffect(() => {
    if (!date || !venue) return undefined;
    return onSnapshot(
      boardRef(date, venue),
      { includeMetadataChanges: true }, // so we know when taps are still waiting to send
      (snap) => setB({ data: snap.exists() ? snap.data() : null, pending: snap.metadata.hasPendingWrites, loaded: true, error: '' }),
      (e) => setB((s) => ({ ...s, loaded: true, error: e.message }))
    );
  }, [date, venue]);
  return b;
}

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
  const board = useBoard(screening.date, screening.venue);
  const entry = board.data?.s?.[screening.id] || null;
  const [error, setError] = useState('');

  // taps not sent yet: { inLine: +3, seatsLeft: -2 }
  const unsent = useRef({ inLine: 0, seatsLeft: 0 });
  const [, redraw] = useState(0);
  const timers = useRef({ quiet: null, first: null });

  const byName = profile.name || profile.email || '';
  const write = useCallback(
    (fields) =>
      setDoc(
        boardRef(screening.date, screening.venue),
        {
          date: screening.date,
          venue: screening.venue,
          updatedAt: serverTimestamp(),
          s: { [screening.id]: { ...fields, updatedAt: serverTimestamp(), byName } },
        },
        { merge: true }
      ).catch((e) => setError(e.message)),
    [screening.date, screening.venue, screening.id, byName]
  );

  const send = useCallback(() => {
    clearTimeout(timers.current.quiet);
    clearTimeout(timers.current.first);
    timers.current = { quiet: null, first: null };
    const { inLine, seatsLeft } = unsent.current;
    if (!inLine && !seatsLeft) return;
    unsent.current = { inLine: 0, seatsLeft: 0 };
    const fields = {};
    if (inLine) fields.inLine = increment(inLine);
    if (seatsLeft) fields.seatsLeft = increment(seatsLeft);
    write(fields);
    redraw((n) => n + 1);
  }, [write]);

  // send anything left when leaving this screen or hiding the app
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && send();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      send();
    };
  }, [send]);

  const bump = (field, by) => {
    unsent.current = { ...unsent.current, [field]: unsent.current[field] + by };
    redraw((n) => n + 1);
    clearTimeout(timers.current.quiet);
    timers.current.quiet = setTimeout(send, SEND_AFTER_MS);
    if (!timers.current.first) timers.current.first = setTimeout(send, SEND_AT_MOST_MS);
  };

  const start = () => write({ inLine: 0, seatsLeft: screening.capacity || 0 });
  const markFull = () => {
    unsent.current = { ...unsent.current, seatsLeft: 0 };
    send();
    write({ seatsLeft: 0 });
  };

  const inLine = Math.max(0, (entry?.inLine ?? 0) + unsent.current.inLine);
  const seatsLeft = Math.min(screening.capacity || Infinity, Math.max(0, (entry?.seatsLeft ?? 0) + unsent.current.seatsLeft));
  const label = entry ? queueLabel({ inLine, seatsLeft }) : null;
  const waiting = board.pending || unsent.current.inLine !== 0 || unsent.current.seatsLeft !== 0;

  return (
    <div className="door">
      <button type="button" className="ad-back door-back" onClick={() => { send(); onBack(); }}><ChevronLeft size={18} /> All screenings</button>
      <div className="door-head">
        <span className="door-time">{timeLabel(screening.time)} · {screening.screen}</span>
        <h1 className="door-title">{film?.title || screening.film}</h1>
        <span className="muted small">{venueName} · {screening.capacity} seats</span>
      </div>

      {!board.loaded && <p className="muted">Loading…</p>}
      {(error || board.error) && <p className="ad-error">Couldn't save: {error || board.error}</p>}

      {board.loaded && !entry && (
        <div className="ad-card door-start">
          <p>No count yet for this screening. Start when the queue opens.</p>
          <button type="button" className="btn btn-gold door-start-btn" onClick={start}>Start counting</button>
          <p className="muted small">Starts at 0 in line and {screening.capacity} seats left. Attendees see the queue once you start.</p>
        </div>
      )}

      {entry && (
        <>
          <div className="door-status">
            {label && <span className={`label tone-${label.tone}`}>{label.text}</span>}
            <span className="muted small">
              {waiting ? 'Saving… (sends by itself, even after losing signal)' : `Saved · ${ago(entry.updatedAt)}${entry.byName ? ` by ${entry.byName}` : ''}`}
            </span>
          </div>
          <Counter label="People in line" value={inLine} onChange={(by) => bump('inLine', by)} />
          <Counter label="Seats left" value={seatsLeft} onChange={(by) => bump('seatsLeft', by)} max={screening.capacity} />
          <button type="button" className="btn btn-outline door-full" onClick={markFull} disabled={seatsLeft === 0}>
            Mark as full (0 seats)
          </button>
          <p className="muted small door-note">Attendees see new counts within about a minute.</p>
        </>
      )}
    </div>
  );
}

// Small "12 in line · 40 seats" line on each screening in the list
function RowCount({ board, id }) {
  const e = board.data?.s?.[id];
  if (!e) return null;
  const label = queueLabel({ inLine: Math.max(0, e.inLine || 0), seatsLeft: Math.max(0, e.seatsLeft || 0) });
  return <span className={`door-row-count tone-${label.tone}`}>{Math.max(0, e.inLine || 0)} in line · {Math.max(0, e.seatsLeft || 0)} seats</span>;
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

  // volunteers only ever see today; admins can look at any festival day
  const shownDay = isAdmin ? day : today;
  const board = useBoard(shownDay, venue); // counts for the list (when one venue is picked)

  if (!isAdmin && !profile.venue) {
    return (
      <div className="ad-page">
        <h1 className="ad-title">Door counter</h1>
        <p className="ad-info">You don't have a venue yet. Ask an admin to set your venue on the Team page.</p>
      </div>
    );
  }

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
              {venue && <RowCount board={board} id={s.id} />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
