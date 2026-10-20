// "My Festival" holds both screenings and events. This turns the saved IDs
// into one list of plan items, sorted by day and time, that every screen
// (My Festival, My plan sheet, day badges, Share my day) can use.
import { SCREENINGS, filmById, venueById } from '../data/programme.js';
import { EVENTS, EVENT_TYPES } from '../data/events.js';
import { fromMinutes, toMinutes } from './format.js';

export function planItems(scheduled) {
  const items = [];
  for (const s of SCREENINGS) {
    if (!scheduled.has(s.id)) continue;
    const film = filmById(s.film);
    items.push({
      kind: 'screening', id: s.id, date: s.date, time: s.time, status: s.status,
      end: fromMinutes(toMinutes(s.time) + film.runtime),
      title: film.title, venue: s.venue, where: `${venueById(s.venue).name} · ${s.screen}`,
      href: `#/film/${film.id}`, film,
    });
  }
  for (const e of EVENTS) {
    if (!scheduled.has(e.id)) continue;
    items.push({
      kind: 'event', id: e.id, date: e.date, time: e.time, end: e.end, status: e.status,
      title: e.title, venue: e.venue, where: e.venue ? `${venueById(e.venue).name} · ${e.place}` : e.place,
      href: `#/event/${e.id}`, event: e, typeLabel: EVENT_TYPES[e.type].label,
    });
  }
  return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export const planForDay = (scheduled, date) => planItems(scheduled).filter((i) => i.date === date);
