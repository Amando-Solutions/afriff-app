// Talking to afriff.com: download pages, find the file holding the film list,
// and notice when the schedule page changes (screening times aren't out yet).
//
// afriff.com is built with Vite: each code file's name ends in a fingerprint of
// its contents (film-selection-test-C2TypRWh.js) and is cached "forever". So a
// new file name = new film data, and the same name = nothing changed. Each
// check downloads only the /program page (~120 KB) unless the name changed.

import { createHash } from 'node:crypto'
import { FILMS_PAGE, SCHEDULE_PAGE, SITE, USER_AGENT } from '../config'

export type Fetcher = (url: string) => Promise<string>

const MAX_BYTES = 5 * 1024 * 1024
const TIMEOUT_MS = 20_000

/** GET a page or file as text (polite user agent, time limit, size limit) */
export const fetchText: Fetcher = async (url) => {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/javascript,*/*;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  const text = await res.text()
  if (text.length > MAX_BYTES) throw new Error(`${url} is unexpectedly large`)
  return text
}

/** Every /assets/*.js file a page or code file mentions, as full addresses */
export function scriptLinks(text: string): string[] {
  const found = new Set<string>()
  for (const m of text.matchAll(/(?:\/|\.\/|["'`])((?:assets\/)?[\w.\-]+\.js)\b/g)) {
    const file = m[1]!.replace(/^assets\//, '')
    if (/^[\w.\-]+-[\w\-]{6,}\.js$/.test(file)) found.add(`${SITE}/assets/${file}`)
  }
  return [...found]
}

const fileName = (url: string) => url.replace(/^.*\//, '')
/** Does this code look like afriff.com's film list? */
export const looksLikeFilmList = (code: string) =>
  (code.match(/["']?slug["']?\s*:\s*[`"']/g)?.length ?? 0) >= 20
  && /["']?programme["']?\s*:\s*[`"']/.test(code) && /["']?title["']?\s*:\s*[`"']/.test(code)

/**
 * Find the address of the file holding the film list. It's normally linked
 * straight from /program and called film-selection-…js; if AFRIFF's developers
 * rename it, the other code files /program links are searched (small ones first).
 */
export async function findFilmListFile(fetcher: Fetcher, programPage: string): Promise<{ url: string; code?: string }> {
  const links = scriptLinks(programPage)
  const named = links.find((u) => /^film-selection/i.test(fileName(u))) ?? links.find((u) => /film/i.test(fileName(u)))
  if (named) return { url: named }
  // fallback: look inside each linked file (not the big shared one)
  for (const url of links.filter((u) => !/^index-/.test(fileName(u))).slice(0, 40)) {
    const code = await fetcher(url).catch(() => '')
    if (looksLikeFilmList(code)) return { url, code }
  }
  throw new Error(`Couldn't find the film list in afriff.com's ${FILMS_PAGE} page (has the site changed?)`)
}

/** The words a visitor sees on a page (no code, no markup) */
export function visibleText(html: string): string {
  const body = html.slice(Math.max(0, html.indexOf('<body')))
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ScheduleCheck {
  /** fingerprint of the page's words: changes when AFRIFF edits the page */
  signature: string
  /** the page no longer says times are to come, or shows clock times */
  timesListed: boolean
}

/** Fingerprint afriff.com's schedule page and guess whether it now lists times */
export function checkSchedulePage(html: string): ScheduleCheck {
  const text = visibleText(html)
  const notYet = /screening times are added when the programme is out/i.test(text)
  const clockTimes = text.match(/\b\d{1,2}[:.]\d{2}\s?(?:am|pm)\b|\b(?:[01]?\d|2[0-3]):[0-5]\d\b/gi)?.length ?? 0
  return {
    signature: createHash('sha256').update(text).digest('hex').slice(0, 16),
    timesListed: !notYet || clockTimes >= 3,
  }
}

export async function fetchSchedule(fetcher: Fetcher): Promise<ScheduleCheck> {
  return checkSchedulePage(await fetcher(SCHEDULE_PAGE))
}
