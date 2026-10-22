import { useCallback, useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { deleteDoc, doc, increment, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, ChevronLeft, LogOut, Plus, Undo2 } from 'lucide-react';
import { auth, db } from './firebase.js';
import { useCollection } from './data.js';
import { FESTIVAL } from '../data/programme.js';
import { dayLabel, queueLabel, screeningStart, timeLabel } from '../lib/format.js';
import { lagosDate, now } from '../lib/now.js';

// THE DOOR VIEW (#/door): what door volunteers use, on their own phone.
// Opens straight to today at their venue, highlights the screening to
// count now, and gives two big buttons:
//   + Joined the queue  → people in line +1
//   ✓ Let in            → people in line −1 AND seats left −1, together
// so the seat count goes down by itself as people walk in.
//
// Counts live in ONE record per venue per day: queueDays/{date}/venues/{venue}
// with a map `s` of screeningId → { inLine, seatsLeft, seatsStart, updatedAt,
// byName }. Phones read those records through the /api/queues relay.
//
// Taps show at once and are sent in small bundles (~1 second of tapping per
// save) as "add N" / "take N away", never a fixed number, so two volunteers
// at the same door never overwrite each other and the free database plan's
// write limit isn't eaten up. Taps made without signal are sent on reconnect.

const SEND_AFTER_MS = 1000; // quiet time after the last tap before sending
const SEND_AT_MOST_MS = 2500; // keep tapping and it still sends this often
const COUNT_FROM_MINUTES = 120; // "Count now" from 2 hours before the start

const ago = (ts) => {
  if (!ts?.seconds) return '';
  const m = Math.round((Date.now() - ts.seconds * 1000) / 60000);
  return m <= 0 ? 'just now' : `${m} min ago`;
};
const buzz = () => navigator.vibrate?.(12);

const boardRef = (date, venue) => doc(db, 'queueDays', date, 'venues', venue);

// Live copy of one venue's record for one day
function useBoard(date, venue) {
  const [b, setB] = useState({ data: null, pending: false, loaded: false, error: '' });
  useEffect(() => {
    if (!date || !venue) return undefined;
    setB({ data: null, pending: false, loaded: false, error: '' });
    return onSnapshot(
      boardRef(date, venue),
      { includeMetadataChanges: true }, // so we know when taps are still waiting to send
      (snap) => setB({ data: snap.exists() ? snap.data() : null, pending: snap.metadata.hasPendingWrites, loaded: true, error: '' }),
      (e) => setB((s) => ({ ...s, loaded: true, error: e.message }))
    );
  }, [date, venue]);
  return b;
}

// Keep the screen on while counting (phones that support it)
function useStayAwake() {
  useEffect(() => {
    let lock = null;
    const ask = async () => {
      try {
        if (document.visibilityState === 'visible' && navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
      } catch {
        /* not allowed or not supported: the screen just dims as usual */
      }
    };
    ask();
    document.addEventListener('visibilitychange', ask);
    return () => {
      document.removeEventListener('visibilitychange', ask);
      lock?.release?.().catch(() => {});
    };
  }, []);
}

const clamp = (n, max = Infinity) => Math.min(max, Math.max(0, n || 0));

function Counter({ screening, film, venueName, profile, onBack }) {
  useStayAwake();
  const board = useBoard(screening.date, screening.venue);
  const entry = board.data?.s?.[screening.id] || null;
  const [error, setError] = useState('');
  const [fixing, setFixing] = useState(false);
  const [seatsAtDoor, setSeatsAtDoor] = useState(String(screening.capacity || ''));

  // taps not sent yet, and this phone's taps so far (for Undo)
  const unsent = useRef({ inLine: 0, seatsLeft: 0 });
  const history = useRef([]);
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

  const seatsStart = entry?.seatsStart || screening.capacity || Infinity;
  // the numbers right now: saved counts + taps not sent yet. Read through a
  // ref so quick double-taps see each other (not the numbers on screen).
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const current = () => ({
    inLine: clamp((entryRef.current?.inLine ?? 0) + unsent.current.inLine),
    seatsLeft: clamp((entryRef.current?.seatsLeft ?? 0) + unsent.current.seatsLeft, seatsStart),
  });
  const { inLine, seatsLeft } = current();

  // apply a change now, send it shortly
  const apply = (d, remember = true) => {
    if (!d.inLine && !d.seatsLeft) return;
    unsent.current = { inLine: unsent.current.inLine + (d.inLine || 0), seatsLeft: unsent.current.seatsLeft + (d.seatsLeft || 0) };
    if (remember) history.current.push(d);
    buzz();
    redraw((n) => n + 1);
    clearTimeout(timers.current.quiet);
    timers.current.quiet = setTimeout(send, SEND_AFTER_MS);
    if (!timers.current.first) timers.current.first = setTimeout(send, SEND_AT_MOST_MS);
  };

  const joined = () => apply({ inLine: 1 });
  const letIn = (n) => {
    const now = current();
    const seats = Math.min(n, now.seatsLeft);
    if (!seats) return;
    apply({ inLine: -Math.min(seats, now.inLine), seatsLeft: -seats }); // walk-ins with no queue just use a seat
  };
  const undo = () => {
    const last = history.current.pop();
    if (last) apply({ inLine: -(last.inLine || 0), seatsLeft: -(last.seatsLeft || 0) }, false);
  };
  const start = () => {
    const seats = Math.max(0, parseInt(seatsAtDoor, 10) || 0);
    write({ inLine: 0, seatsLeft: seats, seatsStart: seats });
    buzz();
  };
  const markFull = () => {
    send();
    write({ seatsLeft: 0 });
    history.current = [];
    buzz();
  };

  const label = entry ? queueLabel({ inLine, seatsLeft }) : null;
  const waiting = board.pending || unsent.current.inLine !== 0 || unsent.current.seatsLeft !== 0;
  const full = entry && seatsLeft === 0;

  return (
    <div className="dv">
      <div className="dv-top">
        <button type="button" className="dv-back" onClick={() => { send(); onBack(); }}><ChevronLeft size={20} /> Today</button>
        {entry && (
          <span className={`dv-saved${waiting ? ' waiting' : ''}`}>
            <i aria-hidden="true" /> {waiting ? 'Saving…' : `Saved ${ago(entry.updatedAt)}`}
          </span>
        )}
      </div>

      <div className="dv-head">
        <h1 className="dv-title">{film?.title || screening.film}</h1>
        {label && <span className={`dv-label tone-${label.tone}`}>{label.text}</span>}
      </div>
      <p className="muted">{timeLabel(screening.time)} · {venueName} · {screening.screen}</p>

      {!board.loaded && <p className="muted">Loading…</p>}
      {(error || board.error) && <p className="ad-error">Couldn't save: {error || board.error}</p>}

      {board.loaded && !entry && (
        <div className="dv-card dv-start">
          <label className="dv-small-label" htmlFor="seats-at-door">Seats available at the door</label>
          <div className="dv-start-row">
            <input
              id="seats-at-door" className="dv-seats-input" type="number" inputMode="numeric" min="0"
              value={seatsAtDoor} onChange={(e) => setSeatsAtDoor(e.target.value)}
            />
            <span className="muted small">From the console ({screening.capacity} seats). Change it if some seats are reserved or sold in advance.</span>
          </div>
          <button type="button" className="dv-btn dv-letin" onClick={start}>Start counting</button>
          <p className="muted small">Attendees see this queue as soon as you start.</p>
        </div>
      )}

      {entry && (
        <>
          <div className="dv-numbers">
            <div className="dv-card">
              <span className="dv-small-label">In line</span>
              <span className="dv-n">{inLine}</span>
            </div>
            <div className={`dv-card${full ? ' dv-full-card' : ''}`}>
              <span className="dv-small-label">Seats left</span>
              <span className="dv-n">{seatsLeft}</span>
              <span className="muted small">of {Number.isFinite(seatsStart) ? seatsStart : '?'}</span>
            </div>
          </div>

          {full && (
            <p className="dv-full-note">
              The cinema is full. Attendees now see <strong>Full</strong>.{inLine > 0 ? ` Let the ${inLine} ${inLine === 1 ? 'person' : 'people'} still in line know.` : ''}
            </p>
          )}

          <button type="button" className="dv-btn dv-join" onClick={joined}><Plus size={22} strokeWidth={2.6} /> Joined the queue</button>
          <button type="button" className="dv-btn dv-letin" onClick={() => letIn(1)} disabled={full}>
            <Check size={24} strokeWidth={2.8} /> {full ? 'Let in (no seats left)' : 'Let in'}
          </button>
          <div className="dv-row">
            <button type="button" className="dv-btn dv-small" onClick={() => letIn(5)} disabled={full}>Let in 5</button>
            <button type="button" className="dv-btn dv-small" onClick={undo} disabled={!history.current.length}><Undo2 size={16} /> Undo</button>
            <button type="button" className={`dv-btn dv-small${fixing ? ' on' : ''}`} onClick={() => setFixing(!fixing)}>Fix numbers</button>
          </div>

          {fixing && (
            <div className="dv-card dv-fix">
              <p className="muted small">For corrections, e.g. someone left the line without going in.</p>
              <div className="dv-fix-row">
                <span>In line</span>
                <button type="button" className="dv-step" onClick={() => apply({ inLine: -1 })} disabled={inLine === 0} aria-label="One fewer in line">−</button>
                <button type="button" className="dv-step" onClick={() => apply({ inLine: 1 })} aria-label="One more in line">+</button>
              </div>
              <div className="dv-fix-row">
                <span>Seats left</span>
                <button type="button" className="dv-step" onClick={() => apply({ seatsLeft: -1 })} disabled={seatsLeft === 0} aria-label="One fewer seat">−</button>
                <button type="button" className="dv-step" onClick={() => apply({ seatsLeft: 1 })} disabled={seatsLeft >= seatsStart} aria-label="One more seat">+</button>
              </div>
              <button type="button" className="dv-btn dv-small dv-mark-full" onClick={markFull} disabled={full}>Mark as full (0 seats)</button>
            </div>
          )}
          <p className="muted small dv-note">Attendees see new counts within about a minute.{entry.byName ? ` Last saved by ${entry.byName}.` : ''}</p>
        </>
      )}
    </div>
  );
}

// Where each screening stands, for the Today list
function stateOf(s, entry, t) {
  const start = screeningStart(s).getTime();
  if (start <= t) return 'done';
  if (entry) return 'counting';
  if (start - t <= COUNT_FROM_MINUTES * 60000) return 'now';
  return 'later';
}

export default function DoorCounter({ profile, standalone = false }) {
  const screenings = useCollection('screenings');
  const films = useCollection('films');
  const venues = useCollection('venues');
  const isAdmin = profile.role === 'admin';
  const today = lagosDate();
  const [venue, setVenue] = useState(isAdmin ? '' : profile.venue);
  const [day, setDay] = useState(FESTIVAL.days.includes(today) ? today : FESTIVAL.days[0]);
  const [openId, setOpenId] = useState(null);
  const [clearing, setClearing] = useState('');

  // volunteers only ever see today; admins can look at any festival day
  const shownDay = isAdmin ? day : today;
  const board = useBoard(shownDay, venue);
  const t = now().getTime();

  if (!isAdmin && !profile.venue) {
    return (
      <div className="dv-page">
        <h1 className="ad-title">Door</h1>
        <p className="ad-info">You don't have a venue yet. Ask an admin to set your venue on the Team page.</p>
      </div>
    );
  }

  const list = (screenings.items || [])
    .filter((s) => s.date === shownDay && (!venue || s.venue === venue))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const open = list.find((s) => s.id === openId);
  const venueName = (id) => venues.map[id]?.name || id;
  const filmTitle = (s) => films.map[s.film]?.title || s.film;

  if (open) {
    return (
      <div className="dv-page">
        <Counter screening={open} film={films.map[open.film]} venueName={venueName(open.venue)} profile={profile} onBack={() => setOpenId(null)} />
      </div>
    );
  }

  const entries = venue ? board.data?.s || {} : {};
  const rows = list.map((s) => ({ s, entry: entries[s.id], state: stateOf(s, entries[s.id], t) }));
  // the one to count now: something already being counted, else the next to start within 2 hours
  const focus = venue ? rows.find((r) => r.state === 'counting') || rows.find((r) => r.state === 'now') : null;

  const clearAll = async () => {
    if (!window.confirm(`Delete every queue count at ${venueName(venue)} on ${dayLabel(shownDay)}? Use this to remove test counts.`)) return;
    setClearing('Clearing…');
    try {
      await deleteDoc(boardRef(shownDay, venue));
      setClearing('Counts cleared.');
    } catch (e) {
      setClearing(`Couldn't clear: ${e.message}`);
    }
  };

  return (
    <div className="dv-page">
      {standalone && (
        <div className="dv-top">
          <span className="dv-brand"><img src="/logo.svg" alt="" width="26" height="26" /> Door</span>
          <span className="dv-top-right">
            {isAdmin && <a className="muted small" href="#/admin">Console</a>}
            <button type="button" className="icon-btn" onClick={() => signOut(auth)} aria-label="Log out"><LogOut size={18} /></button>
          </span>
        </div>
      )}
      <h1 className="dv-title">{venue ? venueName(venue) : 'Pick a venue'}</h1>
      <p className="muted">{dayLabel(shownDay)}{!isAdmin && ` · ${profile.name || profile.email}`}</p>

      {isAdmin && (
        <div className="door-pickers">
          <select value={venue} onChange={(e) => setVenue(e.target.value)} aria-label="Venue">
            <option value="">Pick a venue</option>
            {(venues.items || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day">
            {FESTIVAL.days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
          </select>
        </div>
      )}

      {screenings.items == null && <p className="muted">Loading…</p>}
      {screenings.items?.length === 0 && <p className="ad-info">No screenings in the database yet. An admin needs to load the festival data first (Festival data page).</p>}
      {venue && screenings.items?.length > 0 && list.length === 0 && (
        <p className="muted">{isAdmin ? 'No screenings at this venue on this day.' : 'No screenings at your venue today.'}</p>
      )}

      {focus && (
        <button type="button" className="dv-card dv-focus" onClick={() => setOpenId(focus.s.id)}>
          <span className="dv-eyebrow">
            {focus.state === 'counting' ? 'Counting now' : 'Count now'} · starts {timeLabel(focus.s.time)}
          </span>
          <span className="dv-focus-title">{filmTitle(focus.s)}</span>
          <span className="muted small">{focus.s.screen} · {focus.entry ? `${clamp(focus.entry.inLine)} in line · ${clamp(focus.entry.seatsLeft)} seats left` : `${focus.s.capacity} seats`}</span>
          <span className="dv-btn dv-letin dv-focus-btn">Open counter</span>
        </button>
      )}

      {venue && (
        <div className="dv-list">
          {rows.filter((r) => r !== focus).map(({ s, entry, state }) => (
            <button key={s.id} type="button" className={`dv-list-row ${state}`} onClick={() => setOpenId(s.id)}>
              <span className="dv-list-time">{timeLabel(s.time)}</span>
              <span className="dv-list-text">
                <span className="dv-list-title">{filmTitle(s)}</span>
                <span className="muted small">
                  {s.screen}
                  {entry ? ` · ${state === 'done' ? 'Final: ' : ''}${clamp(entry.inLine)} in line · ${clamp(entry.seatsLeft)} seats left` : ''}
                </span>
              </span>
              <span className={`dv-tag ${state}`}>{{ done: 'Done', counting: 'Counting', now: 'Count now', later: 'Next' }[state]}</span>
            </button>
          ))}
        </div>
      )}

      {isAdmin && venue && board.data && (
        <div className="dv-admin">
          <button type="button" className="btn btn-outline btn-small" onClick={clearAll}>Clear counts for this venue and day</button>
          {clearing && <p className="muted small">{clearing}</p>}
          <p className="muted small">Admins only. Use after testing so practice counts never show on the real day.</p>
        </div>
      )}
    </div>
  );
}
