// Admins: attendee accounts ("App users") in the console (Attendees page and
// the sign-ups part of Reports). Reading attendees/* is admins-only in
// firestore.rules; deleting goes through the staff app's server
// (server/api/attendees/*), which also removes the sign-in and the saved plan.
// Festival emails: lib/emails.ts.
import {
  collection, count, doc, getAggregateFromServer, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, sum, where,
  type Timestamp,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { adminCall } from './serverCall'

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
// is only needed for deleting an account (its sign-in too), which uses a key
// that can't live in a browser.

export interface AttendeeSetup {
  /** the service-account key is there (needed to delete accounts and send festival emails) */
  serviceAccount: boolean
  /** Brevo key + sender address: festival emails can be sent */
  emails: boolean
}

/** What's set up on the staff app's server; null = couldn't reach it. */
export const attendeeSetup = () => adminCall<AttendeeSetup>('/api/attendees/setup').catch(() => null)

/** Deletes the account, its plan and its sign-in (kept for team members). */
export const deleteAttendee = (uid: string) => adminCall<{ login: 'deleted' | 'kept-staff' }>('/api/attendees/delete', { uid })

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
