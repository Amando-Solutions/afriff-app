// Attendee records in Firestore, through the Admin SDK (which firestore.rules
// don't apply to), for the admins' side (logic.ts). Collections:
//   attendees/{uid}       the "App users" list (created by the person's phone).
//   attendeePlans/{uid}   their My Festival (deleted with the account).
//   users/{uid}           team profiles: someone with one keeps their sign-in.
import type { Firestore } from 'firebase-admin/firestore'
import type { AttendeeStore } from './types'

export function firestoreStore(db: Firestore): AttendeeStore {
  return {
    async remove(uid) {
      const batch = db.batch()
      batch.delete(db.doc(`attendees/${uid}`))
      batch.delete(db.doc(`attendeePlans/${uid}`))
      await batch.commit()
    },

    async isStaff(uid) {
      return (await db.doc(`users/${uid}`).get()).exists
    },
  }
}
