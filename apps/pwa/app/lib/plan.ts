// "My Festival" holds both screenings and events. This turns the saved IDs
// into one list of plan items, sorted by day and time, that every screen
// (My Festival, My plan sheet, day badges, Share my day) can use.
import { computed } from 'vue';
import type { FestivalEvent, Film, ItemStatus } from '@afriff/core/types/festival';
import { SCREENINGS, filmById, venueById } from '@afriff/core/data/programme';
import { EVENTS, EVENT_TYPES } from '@afriff/core/data/events';
import { fromMinutes, screeningStart, toMinutes } from '@afriff/core/utils/format';
import { useLiveClock } from '~/lib/queues';

interface PlanBase {
  id: string;
  date: string;
  time: string;
  end: string;
  status?: ItemStatus;
  title: string;
  venue: string | null;
  /** venue name (or place) for sharing and labels */
  venueName: string;
  /** screen or room */
  room: string;
  href: string;
}
export interface ScreeningPlanItem extends PlanBase { kind: 'screening'; film: Film }
export interface EventPlanItem extends PlanBase { kind: 'event'; event: FestivalEvent; typeLabel: string }
export type PlanItem = ScreeningPlanItem | EventPlanItem;

/** "Filmhouse Landmark · Screen 1", or the place for events away from the cinemas */
export const planWhere = (i: PlanItem) => (i.venue ? [i.venueName, i.room].filter(Boolean).join(' · ') : i.venueName);

export function planItems(scheduled: ReadonlySet<string>): PlanItem[] {
  const items: PlanItem[] = [];
  for (const s of SCREENINGS) {
    if (!scheduled.has(s.id)) continue;
    const film = filmById(s.film);
    if (!film) continue;
    items.push({
      kind: 'screening', id: s.id, date: s.date, time: s.time, status: s.status,
      end: fromMinutes(toMinutes(s.time) + film.runtime),
      title: film.title, venue: s.venue, venueName: venueById(s.venue)?.name ?? '', room: s.screen,
      href: `/film/${film.id}`, film,
    });
  }
  for (const e of EVENTS) {
    if (!scheduled.has(e.id)) continue;
    items.push({
      kind: 'event', id: e.id, date: e.date, time: e.time, end: e.end, status: e.status,
      title: e.title, venue: e.venue, venueName: e.venue ? venueById(e.venue)?.name ?? '' : e.place, room: e.venue ? e.place : '',
      href: `/event/${e.id}`, event: e, typeLabel: EVENT_TYPES[e.type].label,
    });
  }
  return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export const planForDay = (scheduled: ReadonlySet<string>, date: string) => planItems(scheduled).filter((i) => i.date === date);

// ---------- Starting soon: My Festival's "Upcoming" and the My plan countdown ----------
/** How long before its start a saved screening or event counts as starting soon (and gets a countdown). */
export const STARTING_SOON_MINUTES = 60;

/** When it starts (ms, Lagos time) */
export const planStart = (i: PlanItem) => screeningStart(i).getTime();

/**
 * The items starting within the next STARTING_SOON_MINUTES (cancelled ones
 * left out), soonest first. Checked every second, so one joins exactly an
 * hour before and leaves when it starts; screens only redraw when the list
 * changes. Call from a component's setup.
 */
export function useStartingSoon(items: () => PlanItem[]) {
  const t = useLiveClock(1000);
  const ids = computed(() => items()
    .filter((i) => i.status !== 'cancelled' && planStart(i) > t.value && planStart(i) - t.value <= STARTING_SOON_MINUTES * 60000)
    .map((i) => i.id)
    .join(' '));
  return computed(() => {
    const soon = new Set(ids.value.split(' '));
    return items().filter((i) => soon.has(i.id));
  });
}
