// Corrections to items the database already holds (films, screenings…).
//
// The database is the master copy, and "Add missing festival data" never
// overwrites what the team typed. These are the exceptions we ship on purpose:
// each one says "if this field STILL holds the value we shipped (or a value we
// know is wrong), change it to this". Anything the team has edited since no
// longer matches, so it's left alone. Safe to press the button again.
//
// The built-in copy in programme.ts already has the new values.

import { DAY_ONE_SWAPS } from './programme'

type Value = string | number | boolean | null
export interface Correction {
  /** the values (or a test) that mean "still ours, safe to change" */
  from: Value[] | ((current: unknown) => boolean)
  to: Value
}
/** collection → item id → field → correction */
export type Corrections = Record<string, Record<string, Record<string, Correction>>>

const PLACEHOLDER_SYNOPSIS = 'Short film. Synopsis coming soon.'

export const CORRECTIONS: Corrections = {
  films: {
    // afriff.com shows the synopsis of "2.6 Seconds: Death in the Outback" on
    // this film's page, and we shipped a placeholder. Written for the app from
    // the film's festival listings (Riga IFF 2026): an animated short.
    '2-love': {
      synopsis: {
        from: (v) => v == null || v === '' || v === PLACEHOLDER_SYNOPSIS || /australia|outback|2\.6 seconds/i.test(String(v)),
        to: 'An animated short set on a tennis court: two ball girls on opposite sides of a tense, bitter match catch each other\'s eye, and their rivalry turns into attraction as they look for a way out of the competition keeping them apart.',
      },
      genre: { from: ['', 'Short', null], to: 'Animation' },
      year: { from: [null, 0, ''], to: 2026 },
      language: { from: ['', null], to: 'English, French' },
    },
  },
  // Sun 1 Nov demo line-up: every film on opening day has a poster. Each pair
  // trades films (sample times), so no film gains or loses a showing.
  screenings: Object.fromEntries(
    DAY_ONE_SWAPS.flatMap(([day1, later, oldFilm, newFilm]) => [
      [day1, { film: { from: [oldFilm], to: newFilm } }],
      [later, { film: { from: [newFilm], to: oldFilm } }],
    ]),
  ),
}

/** Does the database's current value still match a correction's "from"? */
export function stillOurs(fix: Correction, current: unknown) {
  if (typeof fix.from === 'function') return fix.from(current)
  return fix.from.some((v) => v === current || (v == null && current == null))
}
