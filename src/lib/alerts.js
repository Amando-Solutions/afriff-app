// News and alerts helpers for the attendee app.
import { useEffect, useState } from 'react';
import { NEWS, SCREENINGS } from '../data/programme.js';
import { EVENTS } from '../data/events.js';
import { now } from './now.js';

// Status set on a screening/event in the console → tag shown on the item
export const STATUS_TAGS = {
  cancelled: { text: 'Cancelled', tone: 'alert' },
  moved: { text: 'Moved', tone: 'gold' },
  'time-changed': { text: 'Time changed', tone: 'gold' },
};
export const statusTag = (status) => STATUS_TAGS[status] || null;

// Type set on a news item → coloured tag in News
export const NEWS_TAGS = {
  'venue-change': { text: 'Venue change', tone: 'alert' },
  'time-change': { text: 'Time change', tone: 'alert' },
  cancelled: { text: 'Cancelled', tone: 'alert' },
  'sold-out': { text: 'Sold out', tone: 'gold' },
  news: { text: 'News', tone: 'muted' },
};

// The urgent alert shown as the Home banner (newest first; hidden after "until")
export function activeBanner() {
  const t = now().getTime();
  return NEWS.find((n) => n.urgent && (!n.until || new Date(n.until).getTime() > t)) || null;
}

// Where an alert's "View" button goes, if it's about a screening or event
export function newsLink(n) {
  if (n.screening) {
    const s = SCREENINGS.find((x) => x.id === n.screening);
    if (s) return { href: `#/film/${s.film}`, label: 'View screening' };
  }
  if (n.event && EVENTS.some((e) => e.id === n.event)) return { href: `#/event/${n.event}`, label: 'View event' };
  return null;
}

// ---------- Unread count on the bell (remembered on this phone) ----------
const SEEN_KEY = 'afriff-news-seen';
const listeners = new Set();

function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function useUnreadCount() {
  const [, redraw] = useState(0);
  useEffect(() => {
    const f = () => redraw((x) => x + 1);
    listeners.add(f);
    return () => listeners.delete(f);
  }, []);
  const seen = readSeen();
  return NEWS.filter((n) => !seen.has(n.id)).length;
}

// Opening News marks everything as read
export function markAllNewsSeen() {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(NEWS.map((n) => n.id)));
  } catch {
    /* storage blocked */
  }
  listeners.forEach((f) => f());
}
