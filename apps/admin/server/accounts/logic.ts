// Attendee accounts, admins' side (console → Attendees). Called by
// server/api/attendees/*. Attendees sign up, log in and reset passwords with
// Firebase directly from their phones; the two jobs here need keys that can't
// live on a phone:
//   - deleting someone's account when they ask by email (removing a Firebase
//     sign-in needs the service-account key), and
//   - "Send to Brevo": putting people who ticked the email box on the Brevo
//     "App subscribers" list, taking off those who unticked it, and deleting
//     the Brevo contact of anyone who deleted their account in the app
//     (needs the Brevo key).
import { AccountError, type AttendeeStore, type BrevoStatus, type MarketingList } from './types'

export interface AttendeeAdminDeps {
  store: AttendeeStore
  list: MarketingList
  /** remove the account's Firebase sign-in */
  dropLogin(uid: string): Promise<void>
}

export type AttendeeAdmin = ReturnType<typeof createAttendeeAdmin>

export function createAttendeeAdmin({ store, list, dropLogin }: AttendeeAdminDeps) {
  return {
    /**
     * Delete an attendee's account: their records, their Brevo contact, and
     * their sign-in, unless they're also on the AFRIFF team (then the sign-in
     * is their staff login too, and stays). Returns what happened, so the
     * admin knows if anything is left to do by hand.
     */
    async remove(uid: string): Promise<{ brevo: 'deleted' | 'not-needed' | 'failed'; login: 'deleted' | 'kept-staff' }> {
      const a = await store.attendee(uid)
      await store.remove(uid)
      const staff = await store.isStaff(uid)
      if (!staff) await dropLogin(uid)
      const login = staff ? 'kept-staff' : 'deleted'
      // 'off' = never ticked, so never sent. Anything else may have reached Brevo
      // at some point (deleting a contact Brevo doesn't have is harmless).
      if (!a || a.brevo === 'off') return { brevo: 'not-needed', login }
      // Brevo not set up: nobody waiting was ever sent; anyone else needs a look by hand
      if (!list.ready) return { brevo: a.brevo === 'pending' ? 'not-needed' : 'failed', login }
      try {
        await list.forget(a.email)
        return { brevo: 'deleted', login }
      } catch (e) {
        console.error('[attendees] Brevo delete failed', e)
        return { brevo: 'failed', login }
      }
    },

    /** "Send to Brevo": a batch at a time; `more` = press again. */
    async sendToBrevo(batch = 50): Promise<{ done: number; failed: number; more: boolean }> {
      if (!list.ready) throw new AccountError(503, 'Brevo isn\'t set up on the server yet (see .env.example: NUXT_BREVO_API_KEY and NUXT_BREVO_LIST_ID).')
      let done = 0
      let failed = 0

      // accounts deleted in the app: delete their Brevo contact
      const gone = await store.removals(batch)
      for (const r of gone) {
        try {
          await list.forget(r.email)
          await store.dropRemoval(r.uid)
          done++
        } catch (e) {
          console.error('[attendees] Brevo delete failed', e)
          failed++
        }
      }

      // ticked: add; unticked: take off
      const waiting = await store.waitingForBrevo(batch)
      for (const { uid, attendee: a } of waiting) {
        let status: BrevoStatus
        let error = ''
        try {
          if (a.marketing) {
            status = await list.add({ email: a.email, firstName: a.firstName, lastName: a.lastName })
          } else {
            await list.remove(a.email)
            status = 'removed'
          }
          done++
        } catch (e) {
          status = 'failed'
          error = (e instanceof Error ? e.message : String(e)).slice(0, 300)
          failed++
        }
        await store.updateAttendee(uid, { brevo: status, brevoError: error })
      }
      return { done, failed, more: gone.length === batch || waiting.length === batch }
    },
  }
}
