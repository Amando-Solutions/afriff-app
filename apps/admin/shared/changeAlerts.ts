// Alerts for changes attendees must hear about: a screening or event whose
// day, time, place or status changed. Each becomes an urgent news item (Home
// banner, News, linked to the item) sent as a push notification to every phone
// with alerts on, logged in or not.
//
// WHEN (user request 27 Oct: "change a screening, save, publish → a push"): the
// Publish page compares what's about to be published with what attendees have
// now (published/current) and offers one alert per changed item
// (AdminPublish.vue). So it works whoever made the change (an admin, or an
// editor's approved request), and a screening changed three times before a
// publish gets one alert, worded for where it ends up. An item the team already
// wrote its own alert for since the last publish (the form's "Tell attendees?"
// card, or a news item linked to it) is left to that one.
//
// Also used by the item form's "Tell attendees?" card (AdminItemForm.vue), so
// the suggested wording is the same in both places.
import { dayLabel, timeLabel } from '@afriff/core/utils/format'
import type { NewsType } from '@afriff/core/types/festival'

type Doc = Record<string, unknown>

/** The fields that change when or where something happens */
export const CHANGE_KEYS = ['date', 'time', 'venue', 'screen', 'place', 'status'] as const

export interface ChangeAlert {
  /** the screening or event it's about */
  itemId: string
  col: 'screenings' | 'events'
  type: NewsType
  title: string
  body: string
}

/** Film titles and venue names by id, for the wording */
export interface AlertNames {
  films: Record<string, Doc | undefined>
  venues: Record<string, Doc | undefined>
}

const t = (v: unknown) => (v == null ? '' : String(v))

/** True when the day, time, place or status differ */
export const changedWhenOrWhere = (before: Doc, after: Doc) => CHANGE_KEYS.some((k) => t(before[k]) !== t(after[k]))

/** The alert's headline and message for one change, or null if nothing attendees need to hear about changed. */
export function alertFor(col: 'screenings' | 'events', before: Doc, after: Doc, names: AlertNames): Omit<ChangeAlert, 'itemId' | 'col'> | null {
  if (!changedWhenOrWhere(before, after)) return null
  const title = col === 'screenings' ? t(names.films[t(after.film)]?.title) || 'Screening' : t(after.title) || 'Event'
  const where = [t(names.venues[t(after.venue)]?.name), t(after.screen) || t(after.place)].filter(Boolean).join(', ')
  const when = [after.date ? dayLabel(t(after.date)) : '', after.time ? `at ${timeLabel(t(after.time))}` : ''].filter(Boolean).join(' ')
  const whenWhere = [when, where].filter(Boolean).join(', ')
  if (after.status === 'cancelled' && before.status !== 'cancelled') {
    return { type: 'cancelled', title: `${title} cancelled`, body: `${title}${whenWhere ? ` (${whenWhere})` : ''} has been cancelled.` }
  }
  if (before.status === 'cancelled' && after.status !== 'cancelled') {
    return { type: 'news', title: `${title} is back on`, body: `${title} is going ahead${whenWhere ? `: ${whenWhere}` : ''}.` }
  }
  const placeChanged = t(before.venue) !== t(after.venue) || (t(before.screen) || t(before.place)) !== (t(after.screen) || t(after.place))
  if (placeChanged || (after.status === 'moved' && before.status !== 'moved')) {
    return { type: 'venue-change', title: `${title} moved`, body: `${title} is now at ${where || 'a new place'}${when ? `, ${when}` : ''}.` }
  }
  return { type: 'time-change', title: `${title}: new time`, body: `${title} is now ${when || 'at a new time'}${where ? `, ${where}` : ''}.` }
}

interface Bundle { screenings?: Doc[]; events?: Doc[]; news?: Doc[] }

/**
 * One alert per screening or event that changed between what attendees have
 * (`published`, null = never published: nothing to compare, no alerts) and
 * what's about to be published (`next`). Items new since then, or deleted,
 * aren't changes. Items with a news item linked to them that's new since the
 * last publish are left out: the team has already said what it wants to.
 */
export function changeAlerts(published: Bundle | null, next: Bundle, names: AlertNames): ChangeAlert[] {
  if (!published) return []
  const ids = (list: Doc[] | undefined) => new Set((list ?? []).map((d) => t(d.id)))
  const oldNews = ids(published.news)
  const spoken = new Set((next.news ?? []).filter((n) => !oldNews.has(t(n.id))).flatMap((n) => [t(n.screening), t(n.event)]).filter(Boolean))
  const out: ChangeAlert[] = []
  for (const col of ['screenings', 'events'] as const) {
    const before = new Map((published[col] ?? []).map((d) => [t(d.id), d]))
    for (const after of next[col] ?? []) {
      const id = t(after.id)
      const was = before.get(id)
      if (!was || spoken.has(id)) continue
      const alert = alertFor(col, was, after, names)
      if (alert) out.push({ itemId: id, col, ...alert })
    }
  }
  return out
}

/** The news item for an alert, posted now. */
export function alertNews(a: ChangeAlert, now = new Date()) {
  return {
    type: a.type, title: a.title, body: a.body,
    [a.col === 'screenings' ? 'screening' : 'event']: a.itemId,
    urgent: true, push: true, time: now.toISOString(), url: '', until: '',
  }
}
