// What "My Festival" keeps in an attendee's account, so it follows them to
// another phone: planned screenings and events, films marked "Seen it" (date
// + stars) and queues looked at. Stored as attendeePlans/{uid} (firestore.rules
// checks the shape and sizes); the phone keeps its own copy as before
// (apps/pwa/app/lib/store.ts).

export interface SeenEntry {
  /** 'YYYY-MM-DD' the film was marked seen */
  date: string
  /** 0 = no rating, else 1–5 stars */
  rating: number
}

export interface PlanData {
  scheduled: string[]
  watched: Record<string, SeenEntry>
  queuesChecked: string[]
}

/** Size caps, the same as firestore.rules (attendeePlans) */
export const PLAN_LIMITS = { scheduled: 500, watched: 400, queuesChecked: 2000 }

const ID = /^[\w.:-]{1,120}$/

/** A plan read from anywhere (database, old phone copy), cleaned and capped. */
export function cleanPlan(raw: unknown): PlanData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const ids = (v: unknown, max: number) =>
    [...new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && ID.test(x)) : [])].slice(0, max)
  const watched: Record<string, SeenEntry> = {}
  if (d.watched && typeof d.watched === 'object') {
    for (const [id, w] of Object.entries(d.watched as Record<string, unknown>)) {
      if (!ID.test(id) || !w || typeof w !== 'object') continue
      const { date, rating } = w as { date?: unknown; rating?: unknown }
      watched[id] = {
        date: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
        rating: Math.max(0, Math.min(5, Math.round(Number(rating) || 0))),
      }
      if (Object.keys(watched).length >= PLAN_LIMITS.watched) break
    }
  }
  return { scheduled: ids(d.scheduled, PLAN_LIMITS.scheduled), watched, queuesChecked: ids(d.queuesChecked, PLAN_LIMITS.queuesChecked) }
}

/**
 * Two copies made separately (this phone before logging in, and the account):
 * keep everything from both. For a film seen in both, keep the earlier date,
 * and the rating from `preferred` unless it has none.
 */
export function mergePlans(preferred: PlanData, other: PlanData): PlanData {
  const watched: Record<string, SeenEntry> = { ...other.watched }
  for (const [id, w] of Object.entries(preferred.watched)) {
    const o = other.watched[id]
    watched[id] = o
      ? { date: [w.date, o.date].filter(Boolean).sort()[0] ?? '', rating: w.rating || o.rating }
      : w
  }
  return cleanPlan({
    scheduled: [...preferred.scheduled, ...other.scheduled],
    watched,
    queuesChecked: [...preferred.queuesChecked, ...other.queuesChecked],
  })
}

/** Same contents, whatever the order: used to tell whether anything changed. */
export function planFingerprint(p: PlanData): string {
  return JSON.stringify([
    [...p.scheduled].sort(),
    Object.entries(p.watched).sort(([a], [b]) => a.localeCompare(b)).map(([id, w]) => [id, w.date, w.rating]),
    [...p.queuesChecked].sort(),
  ])
}

export const isEmptyPlan = (p: PlanData) =>
  p.scheduled.length === 0 && Object.keys(p.watched).length === 0 && p.queuesChecked.length === 0
