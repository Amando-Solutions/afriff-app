// Anonymous counts for AFRIFF's reports (admin console → Reports).
//
// What's sent: a random device code, the IDs of screenings/events in this
// phone's plan, the films marked "Seen it" with their star rating, and the
// days the app was opened. Never a name, email, phone number or location.
//
// How often: at most once every 30 minutes, and only if something changed,
// to stay inside Firebase's free daily limits.
// On by default; the switch in My Festival turns it off (and clears what
// this phone shared before).
//
// The laptop test version never sends (so testing doesn't pollute reports),
// unless ?share=1 is in the address.
import { lagosDate } from './now.js';

const DOC_URL = (id) =>
  `https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents/usage/${id}` +
  '?key=AIzaSyCPxdNaQyK6r4OU97-zBZBKLqHsHunGzYo';
const SHARE_KEY = 'afriff-share';
const DEVICE_KEY = 'afriff-device';
const LAST_KEY = 'afriff-usage-last';
const DAYS_KEY = 'afriff-usage-days';
const MIN_GAP = 30 * 60 * 1000;

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } },
};

const enabledHere = () =>
  !import.meta.env.DEV || new URLSearchParams(window.location.search).get('share') === '1';

export const getSharing = () => store.get(SHARE_KEY) !== '0';

function deviceId() {
  let id = store.get(DEVICE_KEY);
  if (!id) {
    id = (window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^a-z0-9-]/gi, '');
    store.set(DEVICE_KEY, id);
  }
  return id;
}

// days this phone opened the app (last 60), for the "app usage" report
function activeDays() {
  let days = [];
  try { days = JSON.parse(store.get(DAYS_KEY) || '[]'); } catch { days = []; }
  const today = lagosDate();
  if (!days.includes(today)) {
    days = [...days, today].slice(-60);
    store.set(DAYS_KEY, JSON.stringify(days));
  }
  return days;
}

// Firestore's REST format for our three kinds of values
const toFields = ({ planned, seen, days }) => ({
  v: { integerValue: '1' },
  updatedAt: { timestampValue: new Date().toISOString() },
  planned: { arrayValue: { values: planned.map((s) => ({ stringValue: s })) } },
  days: { arrayValue: { values: days.map((s) => ({ stringValue: s })) } },
  seen: { mapValue: { fields: Object.fromEntries(Object.entries(seen).map(([k, r]) => [k, { integerValue: String(r) }])) } },
});

async function send(payload) {
  const res = await fetch(DOC_URL(deviceId()), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(payload) }),
    keepalive: true,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

let timer = null;
let pending = null;

function lastSent() {
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
    /* offline: try again later */
    timer = setTimeout(flush, MIN_GAP);
  }
}

// Called whenever plans or ratings change (and when the app opens).
export function queueUsageReport({ scheduled, watched }) {
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
export function setSharing(on) {
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
