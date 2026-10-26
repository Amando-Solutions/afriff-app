// Decide what the sync changes, field by field. No database or network here,
// so it's easy to test.
//
// THE RULE: our database is the master copy. A field only changes when
// afriff.com changes it, and only if our copy still holds what afriff.com said
// before (nobody here has edited it since). To know what afriff.com "said
// before", the sync keeps a baseline: afriff.com's values from the last check.
//
//   afriff.com now = before           → nothing to do (even if we differ: our edit stands)
//   afriff.com changed, we = before   → take afriff.com's new value
//   afriff.com changed, we = new      → nothing to do (already have it)
//   afriff.com changed, we edited it  → ask an admin (a change waiting in Approvals)
//   afriff.com emptied a field        → keep ours (never wipe data because a page lost it)
//
// The first check has no baseline: it changes nothing on existing films, only
// learns. Films afriff.com lists that we've never seen are added. A film we saw
// before that's no longer in our database was deleted by the team: not re-added.
// Nothing is ever deleted.

import { posterArt } from '../../../packages/core/src/data/programme'
import { SYNCED_FIELDS, type SyncedField } from '../config'
import { isEmpty, type FilmValues } from '../afriff/films'

export type DbFilm = Record<string, unknown>

export interface Plan {
  firstRun: boolean
  /** fields to change on films we have */
  updates: { id: string; set: FilmValues; before: FilmValues }[]
  /** new films (full records) */
  creates: { id: string; doc: DbFilm }[]
  /** afriff.com changed a field the team edited: proposed for approval */
  proposals: { id: string; values: FilmValues; before: FilmValues }[]
  /** afriff.com emptied a field: ours kept */
  kept: { id: string; field: SyncedField }[]
  /** seen on afriff.com before but deleted from our database by the team: not re-added */
  deletedHere: string[]
  /** listed on afriff.com before, not any more (our film stays) */
  goneFromAfriff: string[]
  /** afriff.com's values now, to compare with next time */
  baseline: Record<string, FilmValues>
}

/** Same value? Empty values ('' / null / 0 / missing) are all the same; text is compared trimmed. */
export function same(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true
  if (isEmpty(a) || isEmpty(b)) return false
  return String(a).trim() === String(b).trim()
}

/** A new film's database record, shaped like the ones the console and earlier imports made */
export function newFilmDoc(id: string, v: FilmValues): DbFilm {
  return {
    title: v.title || id,
    section: v.section ?? '',
    country: v.country ?? '',
    runtime: v.runtime ?? 0,
    year: v.year ?? null,
    director: v.director ?? '',
    language: v.language ?? '',
    genre: v.genre ?? '',
    trailer: v.trailer ?? '',
    synopsis: v.synopsis ?? '',
    image: v.image ?? '',
    cast: v.cast ?? '',
    premiere: '',
    competition: false,
    poster: posterArt(id),
  }
}

export function planSync(
  source: Map<string, FilmValues>,
  db: Map<string, DbFilm>,
  previous: Record<string, FilmValues> | null,
): Plan {
  const plan: Plan = {
    firstRun: !previous, updates: [], creates: [], proposals: [], kept: [], deletedHere: [], goneFromAfriff: [],
    baseline: { ...(previous ?? {}) },
  }
  for (const [id, next] of source) {
    const before = previous?.[id]
    const cur = db.get(id)
    plan.baseline[id] = next
    if (!cur) {
      if (before) plan.deletedHere.push(id)
      else plan.creates.push({ id, doc: newFilmDoc(id, next) })
      continue
    }
    if (!before) continue // first time we see this film next to ours: learn only
    const set: FilmValues = {}
    const was: FilmValues = {}
    const propose: FilmValues = {}
    for (const f of SYNCED_FIELDS) {
      if (!(f in before)) continue // a field we've only just started syncing: learn only
      const n = next[f]
      if (same(n, before[f])) continue // afriff.com didn't change it
      if (isEmpty(n)) { plan.kept.push({ id, field: f }); continue }
      if (same(cur[f], n)) continue // we already have it
      if (same(cur[f], before[f])) { set[f] = n; was[f] = (cur[f] ?? '') as FilmValues[SyncedField] } // untouched here: take it
      else propose[f] = n // edited here: ask
    }
    if (Object.keys(set).length) plan.updates.push({ id, set, before: was })
    if (Object.keys(propose).length) {
      plan.proposals.push({ id, values: propose, before: Object.fromEntries(Object.keys(propose).map((f) => [f, cur[f] ?? ''])) as FilmValues })
    }
  }
  if (previous) plan.goneFromAfriff = Object.keys(previous).filter((id) => !source.has(id) && db.has(id))
  return plan
}
