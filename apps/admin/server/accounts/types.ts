// Attendee accounts, admins' side: the shapes, and what the logic (logic.ts)
// needs from the database and from Brevo. Kept apart from Firebase and Brevo
// so the logic can be tested with a pretend database and list
// (test/accounts.test.ts); the real ones are firestoreStore.ts and brevo.ts.
//
// Sign-up, log-in and password resets are Firebase's own (the attendee app
// talks to Firebase directly); nothing here takes part in them.

/** Where someone stands with the "App subscribers" list in Brevo. */
export type BrevoStatus =
  | 'off' // didn't tick the box: never sent to Brevo
  | 'pending' // ticked (or changed their mind): waiting for "Send to Brevo"
  | 'sent' // on the list
  | 'confirm-sent' // double opt-in: Brevo emailed them a confirm link; they join once they click it
  | 'removed' // unticked later: taken off the list
  | 'failed' // Brevo refused or was unreachable (brevoError says why); "Send to Brevo" retries

/** attendees/{uid}: the "App users" list (created by the person's phone; firestore.rules check it). */
export interface Attendee {
  firstName: string
  lastName: string
  email: string
  emailLower: string
  /** ticked "Yes, AFRIFF can email me festival news and updates" (now) */
  marketing: boolean
  /** 1 if ticked when signing up, else 0 (Reports adds these up per day) */
  optInAtSignUp: 0 | 1
  /** the box's exact wording they agreed to, '' when not ticked: the record of consent */
  consentText: string
  /** ms */
  marketingChangedAt: number
  createdAt: number
  /** 'YYYY-MM-DD' in Lagos */
  createdDay: string
  lastLoginAt: number
  brevo: BrevoStatus
  brevoError: string
}

/** The database, as the logic needs it. */
export interface AttendeeStore {
  attendee(uid: string): Promise<Attendee | null>
  updateAttendee(uid: string, patch: Partial<Attendee>): Promise<void>
  /** Deletes attendees/{uid} and attendeePlans/{uid}. */
  remove(uid: string): Promise<void>
  /** Has a team profile (users/{uid}): their sign-in is also their staff login. */
  isStaff(uid: string): Promise<boolean>
  /** People whose Brevo status is 'pending' or 'failed'. */
  waitingForBrevo(limit: number): Promise<{ uid: string; attendee: Attendee }[]>
  /** Left by "Delete my account" in the app (brevoRemovals/{uid}). */
  removals(limit: number): Promise<{ uid: string; email: string }[]>
  dropRemoval(uid: string): Promise<void>
}

/** The "App subscribers" list (Brevo). */
export interface MarketingList {
  readonly ready: boolean
  /** Brevo asks people to confirm by email before they join */
  readonly doubleOptIn: boolean
  add(contact: { email: string; firstName: string; lastName: string }): Promise<'sent' | 'confirm-sent'>
  remove(email: string): Promise<void>
  /** Delete the contact from Brevo altogether (account deleted) */
  forget(email: string): Promise<void>
}

/** A problem to show the admin, with the HTTP status it's sent with. */
export class AccountError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra: { reason?: string } = {},
  ) {
    super(message)
  }
}
