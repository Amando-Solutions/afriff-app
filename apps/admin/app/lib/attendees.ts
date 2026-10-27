// Admins: attendee accounts ("App users") in the console (Attendees page and
// the sign-ups part of Reports). Reading attendees/* is admins-only in
// firestore.rules; deleting and sending to Brevo go through the staff app's
// server (server/api/attendees/*), which also tidies up the sign-in, the saved
// plan and the Brevo contact.
import {
  collection, count, doc, getAggregateFromServer, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, sum, where,
  type Timestamp,
} from 'firebase/firestore'
import { auth, db } from './firebase'

export type BrevoStatus = 'off' | 'pending' | 'sent' | 'confirm-sent' | 'removed' | 'failed'

export interface AttendeeRow {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
  optInAtSignUp: 0 | 1
  consentText: string
  createdAt: Date | null
  createdDay: string
  lastLoginAt: Date | null
  marketingChangedAt: Date | null
  brevo: BrevoStatus
  brevoError: string
}

export const BREVO_LABELS: Record<BrevoStatus, string> = {
  off: 'Not on the list',
  pending: 'Waiting to be sent',
  sent: 'On the list',
  'confirm-sent': 'Asked to confirm by email',
  removed: 'Taken off the list',
  failed: 'Brevo problem',
}

const asDate = (v: unknown) => ((v as Timestamp | null)?.toDate?.() ?? null)

/** Everyone who signed up, newest first. Reads one record per person. */
export async function loadAttendees(): Promise<AttendeeRow[]> {
  const snap = await getDocs(collection(db, 'attendees'))
  return snap.docs
    .map((d) => {
      const a = d.data()
      return {
        uid: d.id,
        firstName: String(a.firstName ?? ''),
        lastName: String(a.lastName ?? ''),
        email: String(a.email ?? ''),
        marketing: a.marketing === true,
        optInAtSignUp: a.optInAtSignUp === 1 ? 1 : 0,
        consentText: String(a.consentText ?? ''),
        createdAt: asDate(a.createdAt),
        createdDay: String(a.createdDay ?? ''),
        lastLoginAt: asDate(a.lastLoginAt),
        marketingChangedAt: asDate(a.marketingChangedAt),
        brevo: (a.brevo ?? 'off') as BrevoStatus,
        brevoError: String(a.brevoError ?? ''),
      } satisfies AttendeeRow
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
}

// ---------- "Require sign-up" switch (settings/attendeeAccounts) ----------

export async function readRequireSignUp(): Promise<boolean> {
  const snap = await getDoc(doc(db, 'settings', 'attendeeAccounts'))
  return snap.get('requireSignUp') !== false // AFRIFF's choice until switched off
}

export async function saveRequireSignUp(on: boolean) {
  await setDoc(doc(db, 'settings', 'attendeeAccounts'), {
    requireSignUp: on, updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.uid ?? null,
  }, { merge: true })
}

// ---------- Server actions (admins) ----------
// Attendees sign up and log in with Firebase directly. The staff app's server
// is only needed for these two admin jobs (they use keys that can't live in a
// browser): deleting an account (its sign-in too) and "Send to Brevo".

async function adminCall<T>(path: string, body?: unknown): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in again first.')
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as { error?: { message?: string }; statusMessage?: string } | null
  if (!res.ok) throw new Error(json?.error?.message || json?.statusMessage || `The server answered ${res.status}.`)
  return json as T
}

export interface AttendeeSetup {
  /** the service-account key is there (needed to delete accounts) */
  serviceAccount: boolean
  /** Brevo key + list number: "Send to Brevo" works */
  list: boolean
  doubleOptIn: boolean
}

/** What's set up on the staff app's server; null = couldn't reach it. */
export const attendeeSetup = () => adminCall<AttendeeSetup>('/api/attendees/setup').catch(() => null)

/** Deletes the account, its plan, its Brevo contact and its sign-in (kept for team members). */
export const deleteAttendee = (uid: string) =>
  adminCall<{ brevo: 'deleted' | 'not-needed' | 'failed'; login: 'deleted' | 'kept-staff' }>('/api/attendees/delete', { uid })

/** "Send to Brevo", 50 at a time; repeats while it's getting somewhere. */
export async function sendToBrevo(): Promise<{ done: number; failed: number }> {
  let done = 0
  let failed = 0
  for (let round = 0; round < 40; round++) {
    const r = await adminCall<{ done: number; failed: number; more: boolean }>('/api/attendees/brevo', {})
    done += r.done
    failed += r.failed
    if (!r.more || r.done === 0) break
  }
  return { done, failed }
}

// ---------- Reports: sign-ups per day ----------

export interface SignUpDay { day: string; signups: number; optedIn: number }
export interface SignUpReport { total: number; optedInNow: number; days: SignUpDay[] }

/**
 * Sign-ups per day (Lagos time) and how many ticked the email box when they
 * signed up, plus how many say yes now. Counted by the database ("aggregation
 * queries"), so it costs about one read per day shown, however many signed up.
 */
export async function loadSignUpReport(today: string): Promise<SignUpReport> {
  const people = collection(db, 'attendees')
  const [totals, optedIn, first] = await Promise.all([
    getAggregateFromServer(people, { n: count() }),
    getAggregateFromServer(query(people, where('marketing', '==', true)), { n: count() }),
    getDocs(query(people, orderBy('createdDay'), limit(1))),
  ])
  const start = first.docs[0]?.get('createdDay') as string | undefined
  const days: string[] = []
  if (start) {
    for (let d = new Date(`${start}T12:00:00Z`); d.toISOString().slice(0, 10) <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10))
    }
  }
  const shown = days.slice(-45) // the last 45 days at most
  const perDay = await Promise.all(shown.map(async (day) => {
    const r = await getAggregateFromServer(query(people, where('createdDay', '==', day)), { signups: count(), optedIn: sum('optInAtSignUp') })
    return { day, signups: r.data().signups, optedIn: r.data().optedIn }
  }))
  return { total: totals.data().n, optedInNow: optedIn.data().n, days: perDay.reverse() }
}
