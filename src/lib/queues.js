import { useEffect, useState } from 'react';
import { SCREENINGS } from '../data/programme.js';
import { screeningStart } from './format.js';
import { now } from './now.js';

// LIVE QUEUES
// Every screen asks this file for queue counts, so when real counts from
// door volunteers arrive (build step 8) only this file changes.
//
// For now it's a SAMPLE FEED: a queue opens 2 hours before a screening,
// the line grows towards start time, and a new count is "posted" every
// 5 minutes. It follows the test clock (?now=...).

export const QUEUE_OPENS_MINUTES = 120;
const POST_EVERY_MINUTES = 5;

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// The count posted at or before time t, or null if the queue isn't open.
export function queueAt(screening, t = now().getTime()) {
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

// Re-renders the screen every 30 seconds so counts stay live.
export function useLiveClock(everyMs = 30000) {
  const [t, setT] = useState(() => now().getTime());
  useEffect(() => {
    const id = setInterval(() => setT(now().getTime()), everyMs);
    return () => clearInterval(id);
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
  const slot = POST_EVERY_MINUTES * 60000;
  const updates = [];
  for (const { screening } of openQueues(t)) {
    for (let k = 0; k < 4; k++) {
      const q = queueAt(screening, t - k * slot);
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
