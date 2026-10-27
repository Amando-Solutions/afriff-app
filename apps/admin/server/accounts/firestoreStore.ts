// Attendee records in Firestore, through the Admin SDK (which firestore.rules
// don't apply to), for the admins' side (logic.ts). Collections:
//   attendees/{uid}       the "App users" list (created by the person's phone).
//   attendeePlans/{uid}   their My Festival (deleted with the account).
//   pushTokens/{id}       their phones linked for personal pushes (server/utils/pushDevices.ts; deleted too).
//   users/{uid}           team profiles: someone with one keeps their sign-in.
import type { Firestore } from 'firebase-admin/firestore'
import type { AttendeeStore } from './types'

export function firestoreStore(db: Firestore): AttendeeStore {
  return {
    async remove(uid) {
      const batch = db.batch()
      batch.delete(db.doc(`attendees/${uid}`))
      batch.delete(db.doc(`attendeePlans/${uid}`))
      const phones = await db.collection('pushTokens').where('uid', '==', uid).get()
      for (const d of phones.docs) batch.delete(d.ref)
      await batch.commit()
    },

    async isStaff(uid) {
      return (await db.doc(`users/${uid}`).get()).exists
    },
  }
}
