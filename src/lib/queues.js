import { useEffect, useState } from 'react';
import { FESTIVAL, SCREENINGS } from '../data/programme.js';
import { screeningStart } from './format.js';
import { lagosDate, now } from './now.js';

// LIVE QUEUES (build step 8)
// Every screen asks this file for queue counts. The counts come from door
// volunteers (admin console → Door counter), stored as one record per venue
// per day and served to phones by the /api/queues relay. During the festival
// this phone asks for fresh counts every minute while the app is open.
// A screening shows a queue once a volunteer has started counting it, until
// the film starts.
//
// SAMPLE MODE for testing: add ?queues=sample before the # in the address
// to see pretend queues (opens 2 hours before each screening, the line grows,
// a new count every 5 minutes; follows the test clock ?now=...).

export const QUEUE_OPENS_MINUTES = 120;
const POST_EVERY_MINUTES = 5;
const CHECK_EVERY_MS = 60 * 1000;

const SAMPLE = (() => {
  try {
    return new URLSearchParams(window.location.search).get('queues') === 'sample';
  } catch {
    return false;
  }
})();

// ---------- Live counts from door volunteers ----------
let board = { date: null, queues: {} };
const listeners = new Set();
const tell = () => listeners.forEach((fn) => fn());

const BOARD_DIRECT =
  'https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents/queueDays/';
const KEY = 'AIzaSyCPxdNaQyK6r4OU97-zBZBKLqHsHunGzYo';

// the laptop test server has no relay: read the database directly (dev only)
function decode(documents = []) {
  const n = (v) => Number(v?.integerValue ?? v?.doubleValue ?? 0);
  const out = {};
  for (const d of documents) {
    const venue = d.name.split('/').pop();
    for (const [id, e] of Object.entries(d.fields?.s?.mapValue?.fields || {})) {
      const f = e.mapValue?.fields || {};
      out[id] = {
        venue,
        inLine: Math.max(0, n(f.inLine)),
        seatsLeft: Math.max(0, n(f.seatsLeft)),
        updatedAt: f.updatedAt?.timestampValue ? Date.parse(f.updatedAt.timestampValue) : null,
      };
    }
  }
  return out;
}

async function fetchBoard(date) {
  if (!import.meta.env.DEV) {
    const res = await fetch(`/api/queues?date=${date}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).queues || {};
  }
  const res = await fetch(`${BOARD_DIRECT}${date}/venues?pageSize=50&key=${KEY}`, { cache: 'no-store' });
  if (res.status === 404) return {};
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return decode((await res.json()).documents);
}

async function refresh() {
  const date = lagosDate();
  if (!FESTIVAL.days.includes(date)) return; // no queues outside festival days
  try {
    board = { date, queues: await fetchBoard(date) };
    tell();
  } catch {
    /* offline: keep the last counts we had */
  }
}

// Called once when the app starts: check now, every minute while the app is
// open, and whenever it's reopened.
let started = false;
export function startLiveQueues() {
  if (started || SAMPLE) return;
  started = true;
  refresh();
  setInterval(() => document.visibilityState === 'visible' && refresh(), CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && refresh());
}

// ---------- Pretend queues for testing (?queues=sample) ----------
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function sampleAt(screening, t) {
  const startMs = screeningStart(screening).getTime();
  const slot = POST_EVERY_MINUTES * 60000;
  const postedAt = Math.floor(t / slot) * slot;
  const minsBefore = (startMs - postedAt) / 60000;
  if (minsBefore > QUEUE_OPENS_MINUTES || startMs <= t) return null;

  const C = screening.capacity;
  const demand = 0.4 + (hash(screening.id) % 120) / 100; // how popular: 0.4–1.6
  const p = 1 - minsBefore / QUEUE_OPENS_MINUTES; // 0 when queue opens → 1 at start
  const wobble = hash(`${screening.id}${postedAt}`) % 7;
  return {
    inLine: Math.max(0, Math.round(C * demand * 0.7 * p) + wobble),
    seatsLeft: Math.max(0, Math.round(C * (1 - demand * 0.45) - C * demand * 0.35 * p)),
    updatedAt: postedAt,
  };
}

// ---------- What every screen uses ----------

// The latest count for a screening, or null if its queue isn't open.
export function queueAt(screening, t = now().getTime()) {
  if (screening.status === 'cancelled') return null;
  if (SAMPLE) return sampleAt(screening, t);
  const e = board.date === screening.date ? board.queues[screening.id] : null;
  if (!e) return null; // no volunteer is counting this one (yet)
  if (screeningStart(screening).getTime() <= t) return null; // film has started: queue over
  return { inLine: e.inLine, seatsLeft: e.seatsLeft, updatedAt: e.updatedAt || t };
}

// Re-renders the screen every 30 seconds, and as soon as new counts arrive.
export function useLiveClock(everyMs = 30000) {
  const [t, setT] = useState(() => now().getTime());
  useEffect(() => {
    const tick = () => setT(now().getTime());
    const id = setInterval(tick, everyMs);
    listeners.add(tick);
    return () => {
      clearInterval(id);
      listeners.delete(tick);
    };
  }, [everyMs]);
  return t;
}

// All queues open right now, soonest screening first.
export function openQueues(t) {
  return SCREENINGS.map((s) => ({ screening: s, queue: queueAt(s, t) }))
    .filter((x) => x.queue)
    .sort((a, b) => screeningStart(a.screening) - screeningStart(b.screening));
}

// Recent counts across all open queues, latest first.
export function recentUpdates(t, limit = 10) {
  if (!SAMPLE) {
    return openQueues(t)
      .sort((a, b) => b.queue.updatedAt - a.queue.updatedAt || a.screening.time.localeCompare(b.screening.time))
      .slice(0, limit);
  }
  const slot = POST_EVERY_MINUTES * 60000;
  const updates = [];
  for (const { screening } of openQueues(t)) {
    for (let k = 0; k < 4; k++) {
      const q = sampleAt(screening, t - k * slot);
      if (!q) break;
      updates.push({ screening, queue: q });
    }
  }
  return updates.sort((a, b) => b.queue.updatedAt - a.queue.updatedAt || a.screening.time.localeCompare(b.screening.time)).slice(0, limit);
}

export const minutesAgo = (t, at) => {
  const m = Math.max(0, Math.round((t - at) / 60000));
  return m === 0 ? 'just now' : `${m} min ago`;
};

export const isSampleQueues = () => SAMPLE;
