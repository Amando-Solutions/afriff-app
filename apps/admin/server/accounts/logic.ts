// Attendee accounts, admins' side (console → Attendees). Called by
// server/api/attendees/*. Attendees sign up, log in and reset passwords with
// Firebase directly from their phones; the job here needs a key that can't
// live on a phone: deleting someone's account when they ask by email
// (removing a Firebase sign-in needs the service-account key).
// Festival emails are in server/emails/.
import type { AttendeeStore } from './types'

export interface AttendeeAdminDeps {
  store: AttendeeStore
  /** remove the account's Firebase sign-in */
  dropLogin(uid: string): Promise<void>
}

export type AttendeeAdmin = ReturnType<typeof createAttendeeAdmin>

export function createAttendeeAdmin({ store, dropLogin }: AttendeeAdminDeps) {
  return {
    /**
     * Delete an attendee's account: their records (so they get no more
     * festival emails) and their sign-in, unless they're also on the AFRIFF
     * team (then the sign-in is their staff login too, and stays).
     */
    async remove(uid: string): Promise<{ login: 'deleted' | 'kept-staff' }> {
      await store.remove(uid)
      const staff = await store.isStaff(uid)
      if (!staff) await dropLogin(uid)
      return { login: staff ? 'kept-staff' : 'deleted' }
    },
  }
}
