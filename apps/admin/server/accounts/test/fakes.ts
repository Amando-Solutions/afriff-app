// A pretend database and Brevo list for the attendee tests: same behaviour as
// firestoreStore.ts / brevo.ts, kept in memory.
import type { Attendee, AttendeeStore, MarketingList } from '../types'

export function attendee(over: Partial<Attendee> = {}): Attendee {
  return {
    firstName: 'Ada', lastName: 'Obi', email: 'Ada.Obi@Example.com', emailLower: 'ada.obi@example.com',
    marketing: false, optInAtSignUp: 0, consentText: '', marketingChangedAt: 1, createdAt: 1, createdDay: '2026-10-27',
    lastLoginAt: 1, brevo: 'off', brevoError: '', ...over,
  }
}

export function memoryStore() {
  const attendees = new Map<string, Attendee>()
  const plans = new Map<string, unknown>()
  const staff = new Set<string>()
  const removals = new Map<string, string>()
  const copy = <T>(v: T): T => structuredClone(v)

  const store: AttendeeStore = {
    async attendee(uid) { const a = attendees.get(uid); return a ? copy(a) : null },
    async updateAttendee(uid, patch) {
      const a = attendees.get(uid)
      if (!a) throw new Error(`no attendee ${uid}`)
      attendees.set(uid, { ...a, ...copy(patch) })
    },
    async remove(uid) { attendees.delete(uid); plans.delete(uid) },
    async isStaff(uid) { return staff.has(uid) },
    async waitingForBrevo(limit) {
      return [...attendees].filter(([, a]) => a.brevo === 'pending' || a.brevo === 'failed').slice(0, limit).map(([uid, a]) => ({ uid, attendee: copy(a) }))
    },
    async removals(limit) { return [...removals].slice(0, limit).map(([uid, email]) => ({ uid, email })) },
    async dropRemoval(uid) { removals.delete(uid) },
  }
  return { store, attendees, plans, staff, removals }
}

export function fakeList(ready = true, doubleOptIn = false) {
  const members = new Set<string>()
  const forgotten: string[] = []
  let down = false
  const list: MarketingList = {
    ready,
    doubleOptIn,
    async add({ email }) { if (down) throw new Error('Brevo answered 503'); members.add(email); return doubleOptIn ? 'confirm-sent' : 'sent' },
    async remove(email) { if (down) throw new Error('Brevo answered 503'); members.delete(email) },
    async forget(email) { if (down) throw new Error('Brevo answered 503'); members.delete(email); forgotten.push(email) },
  }
  return { list, members, forgotten, setDown: (v: boolean) => { down = v } }
}
