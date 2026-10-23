// Everything on one day (screenings and events) as one list in time order.
// type: 'all' | 'films' | 'events'
import { SCREENINGS, filmById } from '../data/programme.js';
import { eventsOn } from '../data/events.js';
import { toMinutes } from './format.js';

export function dayItems(day, type = 'all') {
  const films = type === 'events' ? [] : SCREENINGS.filter((s) => s.date === day).map((s) => {
    const film = filmById(s.film);
    const start = toMinutes(s.time);
    return { kind: 'screening', id: s.id, time: s.time, start, end: start + film.runtime, venue: s.venue, lane: s.screen, title: film.title, href: `/film/${film.id}`, tag: s.tag, status: s.status, screening: s };
  });
  const events = type === 'films' ? [] : eventsOn(day).map((e) => {
    const start = toMinutes(e.time);
    let end = toMinutes(e.end);
    if (end <= start) end += 24 * 60; // runs past midnight
    return { kind: 'event', id: e.id, time: e.time, start, end, venue: e.venue, lane: e.place || 'Event', title: e.title, href: `/event/${e.id}`, tag: e.tag || 'Public', status: e.status, event: e };
  });
  return [...films, ...events].sort((a, b) => a.start - b.start || (a.kind === 'screening' ? -1 : 1));
}
