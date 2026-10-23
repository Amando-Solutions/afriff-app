// News and alerts helpers for the attendee app.
import { computed, ref } from 'vue';
import { NEWS, SCREENINGS } from '../data/programme';
import { EVENTS } from '../data/events';
import type { NewsItem, ToneLabel } from '~/types/festival';
import { now } from './now';
import { dataVersion } from './liveData';

// Status set on a screening/event in the console → tag shown on the item
export const STATUS_TAGS: Record<string, ToneLabel> = {
  cancelled: { text: 'Cancelled', tone: 'alert' },
  moved: { text: 'Moved', tone: 'gold' },
  'time-changed': { text: 'Time changed', tone: 'gold' },
};
export const statusTag = (status: string | null | undefined): ToneLabel | null => (status && STATUS_TAGS[status]) || null;

// Type set on a news item → coloured tag in News
export const NEWS_TAGS: Record<string, ToneLabel> = {
  'venue-change': { text: 'Venue change', tone: 'alert' },
  'time-change': { text: 'Time change', tone: 'alert' },
  cancelled: { text: 'Cancelled', tone: 'alert' },
  'sold-out': { text: 'Sold out', tone: 'gold' },
  news: { text: 'News', tone: 'muted' },
};

// The urgent alert shown as the Home banner (newest first; hidden after "until")
export function activeBanner(): NewsItem | null {
  const t = now().getTime();
  return NEWS.find((n) => n.urgent && (!n.until || new Date(n.until).getTime() > t)) || null;
}

// Where an alert's "View" button goes, if it's about a screening or event
export function newsLink(n: NewsItem): { href: string; label: string } | null {
  if (n.screening) {
    const s = SCREENINGS.find((x) => x.id === n.screening);
    if (s) return { href: `/film/${s.film}`, label: 'View screening' };
  }
  if (n.event && EVENTS.some((e) => e.id === n.event)) return { href: `/event/${n.event}`, label: 'View event' };
  return null;
}

// ---------- Unread count on the bell (remembered on this phone) ----------
const SEEN_KEY = 'afriff-news-seen';
const seenTick = ref(0);

function readSeen(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function useUnreadCount() {
  return computed(() => {
    void seenTick.value;
    void dataVersion.value; // newly published news counts too
    const seen = readSeen();
    return NEWS.filter((n) => !seen.has(n.id)).length;
  });
}

// Opening News marks everything as read
export function markAllNewsSeen() {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(NEWS.map((n) => n.id)));
  } catch {
    /* storage blocked */
  }
  seenTick.value += 1;
}
