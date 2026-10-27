// A pretend database for the attendee tests: same behaviour as
// firestoreStore.ts, kept in memory.
import type { Attendee, AttendeeStore } from '../types'

export function attendee(over: Partial<Attendee> = {}): Attendee {
  return {
    firstName: 'Ada', lastName: 'Obi', email: 'Ada.Obi@Example.com', emailLower: 'ada.obi@example.com',
    marketing: false, optInAtSignUp: 0, consentText: '', marketingChangedAt: 1, createdAt: 1, createdDay: '2026-10-27',
    lastLoginAt: 1, ...over,
  }
}

export function memoryStore() {
  const attendees = new Map<string, Attendee>()
  const plans = new Map<string, unknown>()
  const staff = new Set<string>()

  const store: AttendeeStore = {
    async remove(uid) { attendees.delete(uid); plans.delete(uid) },
    async isStaff(uid) { return staff.has(uid) },
  }
  return { store, attendees, plans, staff }
}
