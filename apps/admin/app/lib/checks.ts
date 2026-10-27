// The console's checks, field by field: what's wrong with a value, in plain
// words, or null when it's fine. schema.ts says what each field is (type,
// required, limits); this file says what that means. The form shows a
// problem when someone leaves a field, and checks every field before saving
// (AdminItemForm.vue, with @afriff/core/utils/formChecks).
import { FESTIVAL } from '@afriff/core/data/programme'
import { imageLink, videoLink, webLink } from '@afriff/core/utils/links'
import { COLLECTIONS, type CollectionName, type FieldDef, type FormValues } from './schema'
import type { Refs } from './types'

/** Longest text a field takes, unless it says otherwise (schema.ts `max`) */
const TEXT_MAX: Partial<Record<FieldDef['type'], number>> = { text: 200, textarea: 5000, url: 2000 }

// a field's value as text: number boxes hand back numbers once edited (Vue's
// v-model on type="number"), checkboxes true / false
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' && Number.isFinite(v) ? String(v) : '')

function ownProblem(f: FieldDef, value: unknown, refs: Refs): string | null {
  if (f.type === 'checkbox') return null
  const v = text(value)
  if (!v) {
    if (!f.required) return null
    return f.type === 'select' || f.type === 'day' || f.type === 'ref' ? 'Choose one.' : 'Fill this in.'
  }
  const max = f.max ?? TEXT_MAX[f.type]
  switch (f.type) {
    case 'text':
    case 'textarea':
      return max && v.length > max ? `Too long: ${v.length} characters (${max} at most).` : null
    case 'number': {
      if (!/^-?\d+(\.\d+)?$/.test(v)) return 'Use digits only, like 90.'
      const n = Number(v)
      if (f.whole && !Number.isInteger(n)) return 'Use a whole number.'
      if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) {
        return f.max != null ? `Use a number from ${f.min ?? 0} to ${f.max}.` : `Use ${f.min} or more.`
      }
      return null
    }
    case 'url': {
      if (max && v.length > max) return `That link is too long (${max} characters at most).`
      const looksLikeLink = Boolean(webLink(v))
      if (f.link === 'video') {
        if (videoLink(v)) return null
        return looksLikeLink
          ? 'Use a YouTube or Vimeo link. Attendees can’t open trailers on other sites (Google Drive, Mega…).'
          : 'Paste the full link, starting with https://'
      }
      if (f.link === 'image') {
        if (imageLink(v)) return null
        return /^http:\/\//i.test(v) ? 'Use the https:// version of this link: phones block http:// images.' : 'Paste the full image link, starting with https://'
      }
      return looksLikeLink ? null : 'Paste the full link, starting with https://'
    }
    case 'time':
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : 'Use a time like 18:30.'
    case 'color':
      return /^#[0-9a-f]{6}$/i.test(v) ? null : 'Use a colour like #3CCFB8.'
    case 'datetime':
      return /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(v) && !Number.isNaN(Date.parse(v)) ? null : 'Pick a date and a time.'
    case 'day':
      return FESTIVAL.days.includes(v) ? null : 'Pick one of the festival days.'
    case 'select':
      return f.options?.some((o) => o.value === v) ? null : 'Choose one of the options.'
    case 'ref': {
      const list = f.ref ? (refs as Record<string, Record<string, unknown> | undefined>)[f.ref] : undefined
      // still loading: nothing to say yet
      if (!list || !Object.keys(list).length || list[v]) return null
      return `That ${f.ref ? COLLECTIONS[f.ref].single : 'item'} has been deleted. Choose another.`
    }
    default:
      return null
  }
}

/** Two fields that go together (a button's text and its link): this one is empty but the other isn't */
const needs = (key: string, other: string, problem: string) => (v: FormValues) => (!text(v[key]) && text(v[other]) ? problem : null)

// Checks that compare a field with another one on the same form, by
// collection and field. Run once the field's own value is fine.
const TOGETHER: Partial<Record<CollectionName, Record<string, (v: FormValues) => string | null>>> = {
  events: {
    endDate: (v) => {
      const first = text(v.date)
      const last = text(v.endDate)
      if (!last || !first) return null
      if (last === first) return 'Leave this empty for a one-day event.'
      return last < first ? 'The last day must be after the first day.' : null
    },
    // ending after midnight is fine (parties); ending as it starts isn't
    end: (v) => (text(v.end) && text(v.end) === text(v.time) ? 'The end time must be different from the start time.' : null),
    'link.label': needs('link.label', 'link.url', 'Add the button text too, e.g. Register on afriff.com.'),
    'link.url': needs('link.url', 'link.label', 'Add the link this button opens.'),
  },
  howToAttend: {
    'link.label': needs('link.label', 'link.url', 'Add the link text too.'),
    'link.url': needs('link.url', 'link.label', 'Add the link too, or clear the link text.'),
  },
  news: {
    until: (v) => {
      const until = text(v.until)
      const time = text(v.time)
      return until && time && until <= time ? 'Pick a time after the item’s own date and time, or the banner never shows.' : null
    },
  },
}

/** What's wrong with one field of a console form, or null */
export function fieldProblem(col: CollectionName, f: FieldDef, values: FormValues, refs: Refs): string | null {
  return ownProblem(f, values[f.key], refs) ?? TOGETHER[col]?.[f.key]?.(values) ?? null
}

/** Every problem on a form, by field key */
export function formProblems(col: CollectionName, values: FormValues, refs: Refs): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of COLLECTIONS[col].fields) {
    const p = fieldProblem(col, f, values, refs)
    if (p) out[f.key] = p
  }
  return out
}
