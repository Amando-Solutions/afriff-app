// "My Festival" holds both screenings and events. This turns the saved IDs
// into one list of plan items, sorted by day and time, that every screen
// (My Festival, My plan sheet, day badges, Share my day) can use.
import type { FestivalEvent, Film, ItemStatus } from '@afriff/core/types/festival';
import { SCREENINGS, filmById, venueById } from '@afriff/core/data/programme';
import { EVENTS, EVENT_TYPES } from '@afriff/core/data/events';
import { fromMinutes, toMinutes } from '@afriff/core/utils/format';

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
