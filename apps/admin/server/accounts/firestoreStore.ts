// Attendee records in Firestore, through the Admin SDK (which firestore.rules
// don't apply to), for the admins' side (logic.ts). Collections:
//   attendees/{uid}       the "App users" list (created by the person's phone).
//   attendeePlans/{uid}   their My Festival (deleted with the account).
//   brevoRemovals/{uid}   left by "Delete my account" in the app for someone
//                         who may be on Brevo; removed once Brevo has deleted them.
//   users/{uid}           team profiles: someone with one keeps their sign-in.
import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore'
import type { Attendee, AttendeeStore } from './types'

const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0)

function fromDoc(d: DocumentData): Attendee {
  return {
    firstName: String(d.firstName ?? ''),
    lastName: String(d.lastName ?? ''),
    email: String(d.email ?? ''),
    emailLower: String(d.emailLower ?? ''),
    marketing: d.marketing === true,
    optInAtSignUp: d.optInAtSignUp === 1 ? 1 : 0,
    consentText: String(d.consentText ?? ''),
    marketingChangedAt: ms(d.marketingChangedAt),
    createdAt: ms(d.createdAt),
    createdDay: String(d.createdDay ?? ''),
    lastLoginAt: ms(d.lastLoginAt),
    brevo: d.brevo ?? 'off',
    brevoError: String(d.brevoError ?? ''),
  }
}

export function firestoreStore(db: Firestore): AttendeeStore {
  const attendeeRef = (uid: string) => db.doc(`attendees/${uid}`)

  return {
    async attendee(uid) {
      const snap = await attendeeRef(uid).get()
      return snap.exists ? fromDoc(snap.data()!) : null
    },

    async updateAttendee(uid, patch) {
      // only Brevo's outcome is written here; times stay as the phone set them
      await attendeeRef(uid).update(patch)
    },

    async remove(uid) {
      const batch = db.batch()
      batch.delete(attendeeRef(uid))
      batch.delete(db.doc(`attendeePlans/${uid}`))
      await batch.commit()
    },

    async isStaff(uid) {
      return (await db.doc(`users/${uid}`).get()).exists
    },

    async waitingForBrevo(limit) {
      const snap = await db.collection('attendees').where('brevo', 'in', ['pending', 'failed']).limit(limit).get()
      return snap.docs.map((d) => ({ uid: d.id, attendee: fromDoc(d.data()) }))
    },

    async removals(limit) {
      const snap = await db.collection('brevoRemovals').limit(limit).get()
      return snap.docs.map((d) => ({ uid: d.id, email: String(d.get('email') ?? '') })).filter((r) => r.email)
    },

    async dropRemoval(uid) {
      await db.doc(`brevoRemovals/${uid}`).delete()
    },
  }
}
