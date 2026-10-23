// Anonymous counts for AFRIFF's reports (admin console → Reports).
//
// What's sent: a random device code, the IDs of screenings/events in this
// phone's plan, the films marked "Seen it" with their star rating, and the
// days the app was opened. Never a name, email, phone number or location.
//
// How often: at most once every 30 minutes, and only if something changed,
// to stay inside Firebase's free daily limits. Written directly to Firestore
// (no server route); offline writes are queued on the phone by the SDK.
// On by default; the switch in My Festival turns it off (and clears what
// this phone shared before).
//
// The laptop test version never sends (so testing doesn't pollute reports),
// unless ?share=1 is in the address.
import { lagosDate, testSwitch } from './now';

const SHARE_KEY = 'afriff-share';
const DEVICE_KEY = 'afriff-device';
const LAST_KEY = 'afriff-usage-last';
const DAYS_KEY = 'afriff-usage-days';
const MIN_GAP = 30 * 60 * 1000;

const store = {
  get: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } },
};

interface UsagePayload {
  planned: string[];
  seen: Record<string, number>;
  days: string[];
}

const enabledHere = () =>
  !import.meta.dev || testSwitch('share') === '1';

export const getSharing = () => store.get(SHARE_KEY) !== '0';

function deviceId(): string {
  let id = store.get(DEVICE_KEY);
  if (!id) {
    id = (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^a-z0-9-]/gi, '');
    store.set(DEVICE_KEY, id);
  }
  return id;
}

// days this phone opened the app (last 60), for the "app usage" report
function activeDays(): string[] {
  let days: string[] = [];
  try { days = JSON.parse(store.get(DAYS_KEY) || '[]'); } catch { days = []; }
  const today = lagosDate();
  if (!days.includes(today)) {
    days = [...days, today].slice(-60);
    store.set(DAYS_KEY, JSON.stringify(days));
  }
  return days;
}

// Saved straight to Firestore with the SDK (lib/firebase/live.ts, loaded only
// when there's something to send). With no signal the write waits on the
// phone, even across closing the app, and goes when the connection is back,
// so there's nothing to retry here.
async function send(payload: UsagePayload) {
  const { writeUsage } = await import('./firebase/live');
  writeUsage(deviceId(), payload);
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: UsagePayload | null = null;

function lastSent(): { at?: number; fingerprint?: string } {
  try { return JSON.parse(store.get(LAST_KEY) || '{}'); } catch { return {}; }
}

async function flush() {
  timer = null;
  if (!pending) return;
  const payload = pending;
  const fingerprint = JSON.stringify(payload);
  if (lastSent().fingerprint === fingerprint) { pending = null; return; }
  try {
    await send(payload);
    store.set(LAST_KEY, JSON.stringify({ at: Date.now(), fingerprint }));
    pending = null;
  } catch {
    /* the database code couldn't load (offline on a first visit): try again later */
    timer = setTimeout(flush, MIN_GAP);
  }
}

// Called whenever plans or ratings change (and when the app opens).
export function queueUsageReport({ scheduled, watched }: { scheduled: ReadonlySet<string>; watched: ReadonlyMap<string, { rating?: number }> }) {
  if (!enabledHere() || !getSharing()) return;
  pending = {
    planned: [...scheduled].sort(),
    seen: Object.fromEntries([...watched].map(([filmId, w]) => [filmId, w?.rating || 0])),
    days: activeDays(),
  };
  if (timer) return; // a send is already scheduled
  const wait = Math.max(5000, (lastSent().at || 0) + MIN_GAP - Date.now());
  timer = setTimeout(flush, wait);
}

// The switch in My Festival. Turning it off clears what this phone shared.
export function setSharing(on: boolean) {
  store.set(SHARE_KEY, on ? '1' : '0');
  if (!on) {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
    if (enabledHere() && store.get(LAST_KEY)) {
      send({ planned: [], seen: {}, days: [] })
        .then(() => store.set(LAST_KEY, JSON.stringify({ at: Date.now(), fingerprint: 'cleared' })))
        .catch(() => {});
    }
  }
}
