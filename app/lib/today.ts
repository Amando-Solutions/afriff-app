// What's on a festival day, for the Home daily highlight and "Today" list.
import type { FestivalEvent, Film, Screening } from '~/types/festival';
import { DAY_THEMES, FESTIVAL, SCREENINGS, filmById, venueById } from '../data/programme';
import { EVENT_TYPES, eventsOn } from '../data/events';
import { lagosDate } from './now';

const startOf = (item: { date: string; time: string }) => new Date(`${item.date}T${item.time}:00+01:00`).getTime();

// 'before' | 'during' | 'after' the festival, for a given moment
export type FestivalPhase = 'before' | 'during' | 'after';

export function festivalPhase(t: number): FestivalPhase {
  const d = lagosDate(new Date(t));
  if (d < FESTIVAL.days[0]!) return 'before';
  if (d > FESTIVAL.days[FESTIVAL.days.length - 1]!) return 'after';
  return 'during';
}

export type UpcomingItem =
  | { kind: 'screening'; item: Screening; at: number }
  | { kind: 'event'; item: FestivalEvent; at: number };

export function dayInfo(day: string, t: number) {
  const screenings = SCREENINGS.filter((s) => s.date === day && s.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
  const events = eventsOn(day).filter((e) => e.status !== 'cancelled');
  const learn = events.filter((e) => EVENT_TYPES[e.type]?.group === 'learn');
  const other = events.filter((e) => EVENT_TYPES[e.type]?.group !== 'learn');

  // One tile per film: team-picked (featured) first, then the opening film,
  // then films with a real poster, then films still to come in start order.
  const seen = new Set<string>();
  const films: Film[] = [];
  const rank = (s: Screening): [number, number, number] => {
    const f = filmById(s.film);
    return [f?.featured ? 0 : f?.section === 'Opening Movie' ? 0.5 : 1, f?.image ? 0 : 1, startOf(s) < t ? 1 : 0];
  };
  const ranked = [...screenings].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2] || a.time.localeCompare(b.time);
  });
  for (const s of ranked) {
    if (seen.has(s.film)) continue;
    seen.add(s.film);
    const film = filmById(s.film);
    if (film) films.push(film);
  }

  // Everything still to start today, screenings and events together
  const upcoming: UpcomingItem[] = [
    ...screenings.map((s): UpcomingItem => ({ kind: 'screening', item: s, at: startOf(s) })),
    ...events.map((e): UpcomingItem => ({ kind: 'event', item: e, at: startOf(e) })),
  ].filter((x) => x.at > t).sort((a, b) => a.at - b.at);

  const index = FESTIVAL.days.indexOf(day);
  return {
    day, index, total: FESTIVAL.days.length, theme: DAY_THEMES[day] || '',
    films, upcoming,
    counts: { screenings: screenings.length, learn: learn.length, other: other.length },
    tomorrow: FESTIVAL.days[index + 1] || null,
  };
}

export const venueShort = (id: string | null | undefined) => (venueById(id)?.name || '').replace(/^Filmhouse\s+/, '');
