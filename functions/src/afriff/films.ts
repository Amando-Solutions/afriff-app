// afriff.com's film records → our film fields, cleaned the way the team cleans
// them by hand (see "Data sync from afriff.com", 25 Oct, in CLAUDE.md):
//  - ALL-CAPS titles and names get normal capitals ("LADY" → "Lady")
//  - "Not Specified" countries and "Other" languages are left out
//  - only public YouTube / Vimeo links count as trailers (afriff.com also lists
//    Google Drive and Mega links that look like screeners; never used on purpose)
//  - poster paths become full afriff.com links
//  - "Synopsis coming soon" and the like count as no synopsis

import { isUnfinished } from '../../../packages/core/src/utils/unfinished'
import { ALIASES, KNOWN_SOURCE_KEYS, SITE, type SyncedField } from '../config'

/** One film as afriff.com's code describes it (fields we know of; any may be missing) */
export interface AfriffFilm {
  slug: string
  title: string
  originalTitle?: string
  countries?: string[]
  programme?: string
  runtime?: number
  year?: number
  directors?: string[]
  cast?: string[]
  languages?: string[]
  genres?: string[]
  synopsis?: string
  poster?: string
  trailer?: string
  [key: string]: unknown
}

/** Our values for one film, cleaned. Missing or '' / null = afriff.com doesn't say. */
export type FilmValues = Partial<Record<SyncedField, string | number | null>>

export interface SourceList {
  films: Map<string, FilmValues>
  /** afriff.com's own section names by code (OPEN → Opening Movie) */
  sections: Record<string, string>
  /** every field name afriff.com's film records use (to notice new ones) */
  keys: string[]
  /** films skipped because their address can't be a database id */
  skipped: string[]
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Pick the film list and the section names out of the data file's exports */
export function findFilmsAndSections(exports: Record<string, unknown>): { films: AfriffFilm[]; sections: Record<string, string> } {
  const lists = Object.values(exports).filter(
    (v): v is unknown[] => Array.isArray(v) && v.filter((f) => isRecord(f) && typeof f.slug === 'string' && typeof f.title === 'string').length >= v.length * 0.9 && v.length > 0,
  )
  const films = (lists.sort((a, b) => b.length - a.length)[0] ?? []) as AfriffFilm[]
  const codes = new Set(films.map((f) => f.programme).filter(Boolean))
  const sections: Record<string, string> = {}
  for (const v of Object.values(exports)) {
    if (!isRecord(v)) continue
    const entries = Object.entries(v).filter(([, s]) => isRecord(s) && typeof s.name === 'string')
    if (entries.length && entries.filter(([k]) => codes.has(k)).length >= Math.min(codes.size, entries.length) * 0.5) {
      for (const [k, s] of entries) sections[k] = String((s as { name: string }).name)
    }
  }
  return { films, sections }
}

// ---------- Cleaning helpers ----------
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'the', 'to', 'with'])
const hasLetters = (s: string) => /\p{L}/u.test(s)
const allUpper = (s: string) => hasLetters(s) && s === s.toUpperCase() && s !== s.toLowerCase()
const allLower = (s: string) => hasLetters(s) && s === s.toLowerCase() && s !== s.toUpperCase()
const capitalise = (w: string) => w.replace(/^(\P{L}*)(\p{L})/u, (_, pre: string, c: string) => pre + c.toUpperCase())

/** "THE OTHER GAZE" → "The Other Gaze"; titles with any lower-case letters are left alone */
export function tidyTitle(raw: unknown): string {
  const t = text(raw)
  if (!allUpper(t) || (t.match(/\p{Lu}/gu)?.length ?? 0) < 2) return t
  return t.toLowerCase().split(' ').map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : capitalise(w))).join(' ').replace(/-(\p{L})/gu, (_, c: string) => `-${c.toUpperCase()}`)
}

/** "VINCHO NCHOGU" / "uzee usman" → "Vincho Nchogu" / "Uzee Usman"; mixed case is left alone */
export function tidyName(raw: string): string {
  const n = raw.replace(/\s+/g, ' ').trim()
  if (!allUpper(n) && !allLower(n)) return n
  return n.toLowerCase().split(' ').map(capitalise).join(' ').replace(/([-'’])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase())
}

/** Plain text: trimmed, Windows line ends removed */
export const text = (v: unknown): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim() : '')

/** A list field, also splitting "A, B" written as one entry */
function list(v: unknown): string[] {
  const items = Array.isArray(v) ? v : typeof v === 'string' ? [v] : []
  return items.flatMap((x) => text(x).split(',')).map((x) => x.trim()).filter(Boolean)
}
const unique = (xs: string[]) => xs.filter((x, i) => xs.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i)

/** "A & B", "A, B & C" (how our film records write several directors) */
export function joinNames(names: string[]): string {
  const xs = unique(names.map(tidyName).filter(Boolean))
  return xs.length <= 2 ? xs.join(' & ') : `${xs.slice(0, -1).join(', ')} & ${xs.at(-1)}`
}

const NOT_A_COUNTRY = /^(not specified|unspecified|unknown|n\/?a|none|other|tbc|tba|-+)$/i
const NOT_A_LANGUAGE = /^(other|others|not specified|unknown|n\/?a|none|-+)$/i

/** A full https:// link to the poster, or '' */
export function posterLink(v: unknown): string {
  let p = text(v)
  if (!p) return ''
  if (p.startsWith('/')) p = SITE + p
  // the old Lovable address only redirects to afriff.com
  p = p.replace(/^https?:\/\/afriff-revival\.lovable\.app\//i, `${SITE}/`)
  return /^https:\/\/[^\s"'<>]+$/.test(p) ? p : ''
}

const TRAILER_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])
/** A YouTube or Vimeo link, or '' (Drive, Mega etc. are screeners, not trailers) */
export function trailerLink(v: unknown): string {
  const t = text(v)
  try {
    const u = new URL(t)
    return u.protocol === 'https:' && TRAILER_HOSTS.has(u.hostname.toLowerCase()) ? u.toString() : ''
  } catch {
    return ''
  }
}

const wholeNumber = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

/** One afriff.com film → our cleaned values */
export function cleanFilm(f: AfriffFilm, sections: Record<string, string>): FilmValues {
  const synopsis = text(f.synopsis)
  return {
    title: tidyTitle(f.title),
    section: f.programme ? sections[f.programme] ?? '' : '',
    director: joinNames(list(f.directors)),
    country: unique(list(f.countries).filter((c) => !NOT_A_COUNTRY.test(c))).join(', '),
    language: unique(list(f.languages).filter((l) => !NOT_A_LANGUAGE.test(l))).join(', '),
    // our genre is a short label (it sits in a pill on the film page)
    genre: unique(list(f.genres)).slice(0, 2).join(', '),
    runtime: wholeNumber(f.runtime, 1, 600),
    year: wholeNumber(f.year, 1900, 2100),
    synopsis: isUnfinished(synopsis) ? '' : synopsis,
    cast: unique(list(f.cast).map(tidyName)).join(', '),
    image: posterLink(f.poster),
    trailer: trailerLink(f.trailer),
  }
}

/** Is a value empty? ('' / null / missing / 0 all mean "nothing") */
export const isEmpty = (v: unknown) => v == null || v === '' || v === 0

/** The whole list, cleaned, by our film id. Duplicates (ALIASES) only fill gaps in their main film. */
export function cleanList(films: AfriffFilm[], sections: Record<string, string>): SourceList {
  const out = new Map<string, FilmValues>()
  const dupes: [string, FilmValues][] = []
  const skipped: string[] = []
  const keys = new Set<string>()
  for (const f of films) {
    Object.keys(f).forEach((k) => keys.add(k))
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(f.slug)) {
      skipped.push(String(f.slug))
      continue
    }
    const values = cleanFilm(f, sections)
    if (ALIASES[f.slug]) dupes.push([ALIASES[f.slug]!, values])
    else out.set(f.slug, values)
  }
  for (const [id, values] of dupes) {
    const main = out.get(id)
    if (!main) out.set(id, values)
    else for (const [k, v] of Object.entries(values) as [SyncedField, FilmValues[SyncedField]][]) if (isEmpty(main[k]) && !isEmpty(v)) main[k] = v
  }
  return { films: out, sections, keys: [...keys].sort(), skipped }
}

/** Field names afriff.com started using since 26 Oct (maybe screening times) */
export const newSourceKeys = (keys: string[]) => keys.filter((k) => !KNOWN_SOURCE_KEYS.includes(k))
