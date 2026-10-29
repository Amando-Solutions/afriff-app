import { onBeforeUnmount, reactive, ref } from 'vue';
import type { Queue, Screening } from '@afriff/core/types/festival';
import { FESTIVAL, SCREENINGS } from '@afriff/core/data/programme';
import { fromMinutes, screeningStart, toMinutes } from '@afriff/core/utils/format';
import { lagosDate, now, testSwitch } from '@afriff/core/utils/now';

// LIVE QUEUES (build step 8)
// Every screen asks this file for queue counts. The counts come from door
// volunteers (/door), stored as one record per venue per day,
// queueDays/{date}/venues/{venue}. Phones read those records DIRECTLY from
// Firestore with a live listener (no server route): a count a volunteer saves
// shows on open phones within a second or two.
//
// To keep database reads down (each saved count is one read for every phone
// listening), the listener is only open when it's useful:
//   - on festival days,
//   - while the app is on screen (closed when it's in the background),
//   - from 3 hours before the day's first screening until its last one starts.
// Outside that the phone keeps the last counts it had.
// Offline, the listener answers from the phone's cache and catches up by
// itself when the connection is back (see @afriff/core/firebase/app).
// A screening shows a queue once a volunteer has started counting it, until
// the film starts.
//
// SAMPLE MODE for testing: add ?queues=sample to the address
// to see pretend queues (opens 2 hours before each screening, the line grows,
// a new count every 5 minutes; follows the test clock ?now=...).

/** a line opens (volunteers start counting) about this long before its screening */
export const QUEUE_OPENS_MINUTES: number = 120;
const POST_EVERY_MINUTES = 5;
/** start listening this long before a screening (volunteers may start counting early) */
const LISTEN_BEFORE_MINUTES = 180;
const RECHECK_MS = 60 * 1000;

const SAMPLE = testSwitch('queues') === 'sample';

// ---------- Live counts from door volunteers ----------
type BoardEntry = Omit<Queue, 'updatedAt'> & { venue: string; updatedAt: number | null };
let board: { date: string | null; queues: Record<string, BoardEntry> } = { date: null, queues: {} };
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((fn) => fn());

/** What the Queues screen says about the feed. */
export const queueFeed = reactive({
  /** a listener is open right now */
  listening: false,
  /** the counts on screen came from the server (false = this phone's saved copy) */
  live: false,
});

// Is any screening today within the listening window?
function wantedNow(date: string, t: number): boolean {
  if (!FESTIVAL.days.includes(date)) return false;
  return SCREENINGS.some((s) => {
    if (s.date !== date || s.status === 'cancelled') return false;
    const start = screeningStart(s).getTime();
    return t >= start - LISTEN_BEFORE_MINUTES * 60000 && t < start;
  });
}

let stop: (() => void) | null = null;
let listeningDate: string | null = null;

async function listen(date: string) {
  listeningDate = date;
  queueFeed.listening = true;
  try {
    const live = await import('./firebase/live');
    if (listeningDate !== date) return; // stopped while loading
    stop = live.watchQueueDay(
      date,
      (queues, fromCache) => {
        board = { date, queues };
        queueFeed.live = !fromCache;
        tell();
      },
      () => { queueFeed.live = false; },
    );
  } catch {
    listeningDate = null; // couldn't load the database code (offline first visit): next check retries
    queueFeed.listening = false;
  }
}

function unlisten() {
  stop?.();
  stop = null;
  listeningDate = null;
  queueFeed.listening = false;
  queueFeed.live = false;
}

function check() {
  const t = now().getTime();
  const date = lagosDate();
  const want = document.visibilityState === 'visible' && wantedNow(date, t);
  if (!want) return unlisten();
  if (listeningDate === date) return;
  unlisten();
  void listen(date);
}

// Called once when the app starts (not on the console or the door view).
let started = false;
export function startLiveQueues() {
  if (started || SAMPLE) return;
  started = true;
  check();
  setInterval(check, RECHECK_MS);
  document.addEventListener('visibilitychange', check);
}

// ---------- Pretend queues for testing (?queues=sample) ----------
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function sampleAt(screening: Screening, t: number): Queue | null {
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
    seatsStart: C,
    updatedAt: postedAt,
  };
}

// ---------- What every screen uses ----------

// The latest count for a screening, or null if its queue isn't open.
export function queueAt(screening: Screening, t: number = now().getTime()): Queue | null {
  if (screening.status === 'cancelled') return null;
  if (SAMPLE) return sampleAt(screening, t);
  const e = board.date === screening.date ? board.queues[screening.id] : null;
  if (!e) return null; // no volunteer is counting this one (yet)
  if (screeningStart(screening).getTime() <= t) return null; // film has started: queue over
  // no time yet (the save is still on its way): it was just counted
  return { inLine: e.inLine, seatsLeft: e.seatsLeft, seatsStart: e.seatsStart, updatedAt: e.updatedAt || Date.now() };
}

// A ref holding "now" (ms) that moves on every 30 seconds, and as soon as new
// counts arrive, so whatever reads it redraws.
export function useLiveClock(everyMs = 30000) {
  const t = ref(now().getTime());
  const tick = () => { t.value = now().getTime(); };
  const id = setInterval(tick, everyMs);
  listeners.add(tick);
  onBeforeUnmount(() => {
    clearInterval(id);
    listeners.delete(tick);
  });
  return t;
}

// All queues open right now, soonest screening first.
export interface OpenQueue { screening: Screening; queue: Queue }

export function openQueues(t: number): OpenQueue[] {
  return SCREENINGS.flatMap((s): OpenQueue[] => {
    const queue = queueAt(s, t);
    return queue ? [{ screening: s, queue }] : [];
  }).sort((a, b) => screeningStart(a.screening).getTime() - screeningStart(b.screening).getTime());
}

// A screening on the Queues screen, with its count once a volunteer is counting.
export interface QueueRow { screening: Screening; queue: Queue | null }

const startOf = (s: Screening) => screeningStart(s).getTime();
const upcoming = (t: number) => SCREENINGS
  .filter((s) => s.status !== 'cancelled' && startOf(s) > t)
  .sort((a, b) => startOf(a) - startOf(b));

// "Starting soon": screenings in the next 3 hours (same window the phone
// listens for counts in), plus any further out that are already being counted.
export function startingSoon(t: number): QueueRow[] {
  return upcoming(t).flatMap((s): QueueRow[] => {
    const queue = queueAt(s, t);
    return queue || startOf(s) - t <= LISTEN_BEFORE_MINUTES * 60000 ? [{ screening: s, queue }] : [];
  });
}


// The next screening to start, for "Next line to open" (null after the festival).
export const nextScreening = (t: number): Screening | null => upcoming(t)[0] ?? null;

// When a screening's line opens (about QUEUE_OPENS_MINUTES before it starts), as 'HH:MM'
export const lineOpensAt = (s: Screening) => fromMinutes((toMinutes(s.time) - QUEUE_OPENS_MINUTES + 24 * 60) % (24 * 60));

// "2 hours" / "45 minutes": how long before a screening its line opens
export const lineOpensBefore = QUEUE_OPENS_MINUTES % 60 === 0
  ? `${QUEUE_OPENS_MINUTES / 60} hour${QUEUE_OPENS_MINUTES === 60 ? '' : 's'}`
  : `${QUEUE_OPENS_MINUTES} minutes`;

// "in 25 min" / "in 2 hr 05" until a screening starts
export function startsIn(t: number, s: Screening) {
  const m = Math.max(0, Math.round((startOf(s) - t) / 60000));
  if (m === 0) return 'starting now';
  if (m < 60) return `in ${m} min`;
  const rest = m % 60;
  return `in ${Math.floor(m / 60)} hr${rest ? ` ${String(rest).padStart(2, '0')}` : ''}`;
}

// "Counted 3 min ago". A door count carries the real time it was saved, so
// this compares it with the real clock, not the ?now= test clock (a test day a
// week ahead said "10067 min ago"). Pretend counts (?queues=sample) follow the
// test clock. `t` is the screen's clock, so the text moves on with it.
export const countedAgo = (t: number, at: number) => {
  const m = Math.max(0, Math.floor(((SAMPLE ? t : Date.now()) - at) / 60000));
  if (m === 0) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
};

export const isSampleQueues = () => SAMPLE;
