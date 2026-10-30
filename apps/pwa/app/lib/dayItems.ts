// Everything on one day (screenings and events) as one list in time order.
import type { FestivalEvent, ItemStatus, Screening, Tag } from '@afriff/core/types/festival';
import { SCREENINGS, filmById } from '@afriff/core/data/programme';
import { eventsOn, isAfcm } from '@afriff/core/data/events';
import { toMinutes } from '@afriff/core/utils/format';

// 'events' = everything that isn't a film except AFCM sessions, which have their own filter
export type DayItemType = 'all' | 'films' | 'events' | 'afcm';

interface DayItemBase {
  id: string;
  time: string;
  /** minutes since midnight */
  start: number;
  end: number;
  venue: string | null;
  /** timeline row: screen or room */
  lane: string;
  title: string;
  href: string;
  tag: Tag;
  status?: ItemStatus;
}
export type DayItem =
  | (DayItemBase & { kind: 'screening'; screening: Screening })
  | (DayItemBase & { kind: 'event'; event: FestivalEvent });

export function dayItems(day: string, type: DayItemType = 'all'): DayItem[] {
  const films: DayItem[] = type === 'events' || type === 'afcm' ? [] : SCREENINGS.filter((s) => s.date === day).flatMap((s): DayItem[] => {
    const film = filmById(s.film);
    if (!film) return [];
    const start = toMinutes(s.time);
    return [{ kind: 'screening', id: s.id, time: s.time, start, end: start + film.runtime, venue: s.venue, lane: s.screen, title: film.title, href: `/film/${film.id}`, tag: s.tag, status: s.status, screening: s }];
  });
  const events: DayItem[] = type === 'films' ? [] : eventsOn(day).filter((e) => type === 'all' || (type === 'afcm') === isAfcm(e)).map((e): DayItem => {
    const start = toMinutes(e.time);
    let end = toMinutes(e.end);
    if (end <= start) end += 24 * 60; // runs past midnight
    return { kind: 'event', id: e.id, time: e.time, start, end, venue: e.venue, lane: e.place || 'Event', title: e.title, href: `/event/${e.id}`, tag: e.tag || 'Public', status: e.status, event: e };
  });
  return [...films, ...events].sort((a, b) => a.start - b.start || (a.kind === 'screening' ? -1 : 1));
}
