// Contacts (console → Contacts): everyone AFRIFF can invite, as ONE list.
//
// A contact is a person, known by their email (in lower case: the "key"). Two
// records can describe them, and the list joins them by that key:
//   attendees/{uid}   they signed up in the app: their name, email and their
//                     own emails choice (the box on the sign-up page, and the
//                     Profile switch). Theirs: AFRIFF can't change it.
//   contacts/{key}    AFRIFF's own record: groups, VIP, notes; and for a guest
//                     added by hand ("Added by AFRIFF"), their name, email and
//                     whether an admin confirmed they agreed to invitations.
//                     A VIP sign-up link writes one too (firestore.rules check it).
// So every sign-up is a contact by itself, and someone added by hand who later
// signs up with the same email is still one contact, never two.
//
// WHO CAN BE EMAILED: someone with an app account, only if their own choice in
// the app says yes. Someone without one, only if an admin ticked "This guest
// agreed to receive AFRIFF invitations" when adding them, and they haven't
// unsubscribed since.
//
// Shared by the console and the staff app's server (which works out each
// invite's guests again when sending), so the count before sending is the
// count sent. No Firebase here: plain data in, plain data out.
import { normaliseEmail } from '@afriff/core/accounts/rules'
import type { Audience } from './invites'

/** How they first reached AFRIFF's lists */
export type Source = 'app' | 'vip-link' | 'afriff'

export const SOURCE_LABEL: Record<Source, string> = { app: 'Signed up in the app', 'vip-link': 'VIP sign-up link', afriff: 'Added by AFRIFF' }

/** contacts/{key} as stored (times in ms) */
export interface ContactRecord {
  key: string
  /** a guest added by hand: their details (app users' come from their account) */
  firstName: string
  lastName: string
  email: string
  source: Source
  vip: boolean
  groups: string[]
  /** groups an admin took them out of: a VIP link can't put them back */
  removedFrom: string[]
  /** their app account, when they joined through a VIP link */
  uid: string
  /** the VIP link they joined through last (vipLinks/{code}) */
  lastLink: string
  /** added by hand: an admin confirmed they agreed to invitations */
  agreed: boolean
  agreedByName: string
  agreedAt: number
  /** they used an invite's unsubscribe link (hand-added guests can't be ticked back on) */
  unsubscribedAt: number
  notes: string
  addedByName: string
  createdAt: number
}

/** attendees/{uid}: the parts the contacts list needs */
export interface AttendeeFacts {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
  createdAt: number
}

export type Consent = 'app-yes' | 'app-no' | 'agreed' | 'not-agreed' | 'unsubscribed'

export const CONSENT_LABEL: Record<Consent, string> = {
  'app-yes': 'Ticked the box in the app',
  'app-no': 'Didn’t tick the box in the app',
  agreed: 'Agreed (confirmed by AFRIFF)',
  'not-agreed': 'Not confirmed as agreeing',
  unsubscribed: 'Unsubscribed',
}

export interface Person {
  key: string
  uid: string
  firstName: string
  lastName: string
  email: string
  hasApp: boolean
  source: Source
  vip: boolean
  groups: string[]
  removedFrom: string[]
  consent: Consent
  canEmail: boolean
  notes: string
  /** ms: signed up, or added */
  since: number
  contact: ContactRecord | null
  attendee: AttendeeFacts | null
}

/** A contact's key: their email, trimmed, lower case. */
export const contactKey = (email: string) => normaliseEmail(email)

/** Firestore can't hold "/" in a record's name; such emails can't be added by hand. */
export const keyUsable = (key: string) => key.length > 0 && key.length <= 254 && !key.includes('/') && key !== '.' && key !== '..'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emptyContact(key: string): ContactRecord {
  return {
    key, firstName: '', lastName: '', email: '', source: 'app', vip: false, groups: [], removedFrom: [], uid: '', lastLink: '',
    agreed: false, agreedByName: '', agreedAt: 0, unsubscribedAt: 0, notes: '', addedByName: '', createdAt: 0,
  }
}

/** Whatever was stored, as a ContactRecord (times may arrive as ms or as { toMillis }). */
export function contactFrom(key: string, d: Record<string, unknown>): ContactRecord {
  const ms = (v: unknown) => (typeof v === 'number' ? v : typeof (v as { toMillis?: unknown })?.toMillis === 'function' ? (v as { toMillis(): number }).toMillis() : 0)
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return {
    key,
    firstName: s(d.firstName), lastName: s(d.lastName), email: s(d.email),
    // a VIP link's own record has no source (firestore.rules keep a phone's write small): it has lastLink
    source: d.source === 'afriff' || d.source === 'vip-link' ? d.source : d.lastLink ? 'vip-link' : 'app',
    vip: d.vip === true,
    groups: list(d.groups), removedFrom: list(d.removedFrom),
    uid: s(d.uid),
    lastLink: s(d.lastLink),
    agreed: d.agreed === true, agreedByName: s(d.agreedByName), agreedAt: ms(d.agreedAt),
    unsubscribedAt: ms(d.unsubscribedAt),
    notes: s(d.notes), addedByName: s(d.addedByName), createdAt: ms(d.createdAt ?? d.joinedAt),
  }
}

function consentOf(a: AttendeeFacts | null, c: ContactRecord | null): Consent {
  // their own choice in the app decides, once they have an account
  if (a) return a.marketing ? 'app-yes' : 'app-no'
  if (c?.unsubscribedAt) return 'unsubscribed'
  return c?.agreed ? 'agreed' : 'not-agreed'
}

/** One person per email, from both kinds of record. */
export function mergePeople(attendees: AttendeeFacts[], contacts: ContactRecord[]): Person[] {
  const byKey = new Map<string, { a: AttendeeFacts | null; c: ContactRecord | null }>()
  for (const a of attendees) {
    const key = contactKey(a.email)
    if (!key) continue
    const slot = byKey.get(key)
    // one account per email in Firebase; if two ever share one, keep the newer
    if (!slot) byKey.set(key, { a, c: null })
    else if (!slot.a || a.createdAt > slot.a.createdAt) slot.a = a
  }
  for (const c of contacts) {
    const slot = byKey.get(c.key)
    if (slot) slot.c = c
    else byKey.set(c.key, { a: null, c })
  }
  return [...byKey].map(([key, { a, c }]) => {
    const consent = consentOf(a, c)
    const email = a?.email || c?.email || key
    return {
      key,
      uid: a?.uid || c?.uid || '',
      firstName: a?.firstName || c?.firstName || '',
      lastName: a?.lastName || c?.lastName || '',
      email,
      hasApp: Boolean(a),
      source: c?.source ?? 'app',
      vip: c?.vip ?? false,
      groups: c?.groups ?? [],
      removedFrom: c?.removedFrom ?? [],
      consent,
      canEmail: (consent === 'app-yes' || consent === 'agreed') && EMAIL.test(email),
      notes: c?.notes ?? '',
      since: a?.createdAt || c?.createdAt || 0,
      contact: c,
      attendee: a,
    }
  })
}

/** A–Z by last name, then first name (guest lists, and the order invites go out in). */
export function byName(a: Pick<Person, 'firstName' | 'lastName' | 'key'>, b: Pick<Person, 'firstName' | 'lastName' | 'key'>): number {
  const name = (p: typeof a) => `${p.lastName} ${p.firstName}`.trim().toLocaleLowerCase('en-GB') || p.key
  return name(a).localeCompare(name(b), 'en-GB') || a.key.localeCompare(b.key)
}

export type SkipReason = 'no-consent' | 'unsubscribed' | 'bad-email'

export const SKIP_LABEL: Record<SkipReason, string> = {
  'no-consent': 'haven’t agreed to emails',
  unsubscribed: 'unsubscribed',
  'bad-email': 'have no usable email',
}

export interface Resolved {
  /** who gets it: each person once, A–Z */
  send: Person[]
  /** chosen, but can't be emailed */
  skipped: { person: Person; reason: SkipReason }[]
  /** taken out by "Leave out" */
  excluded: number
  /** people counted more than once in what was chosen (in two groups, or a group and picked too), each sent once */
  duplicates: number
}

/** Who an invite goes to: whole groups + people picked − people left out, once each, only those who can be emailed. */
export function resolveAudience(people: Person[], a: Audience): Resolved {
  const byKey = new Map(people.map((p) => [p.key, p]))
  const groups = new Set(a.groups)
  const out = new Set(a.exclude)
  const chosen = new Map<string, Person>()
  let mentions = 0
  const add = (p: Person | undefined) => {
    if (!p) return
    mentions++
    chosen.set(p.key, p)
  }
  for (const p of people) for (const g of p.groups) if (groups.has(g)) add(p)
  for (const k of a.people) add(byKey.get(k))

  const r: Resolved = { send: [], skipped: [], excluded: 0, duplicates: mentions - chosen.size }
  for (const p of chosen.values()) {
    if (out.has(p.key)) r.excluded++
    else if (p.canEmail) r.send.push(p)
    else r.skipped.push({ person: p, reason: p.consent === 'unsubscribed' ? 'unsubscribed' : !EMAIL.test(p.email) ? 'bad-email' : 'no-consent' })
  }
  r.send.sort(byName)
  r.skipped.sort((x, y) => byName(x.person, y.person))
  return r
}

/** The keys a resolve needs to read: whoever is picked or left out (group members are found by group). */
export const audienceKeys = (a: Audience) => [...new Set([...a.people, ...a.exclude])]
