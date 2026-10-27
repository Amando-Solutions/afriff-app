// Attendee accounts, admins' side: the shapes, and what the logic (logic.ts)
// needs from the database. Kept apart from Firebase so the logic can be tested
// with a pretend database (test/accounts.test.ts); the real one is
// firestoreStore.ts.
//
// Sign-up, log-in and password resets are Firebase's own (the attendee app
// talks to Firebase directly); nothing here takes part in them.

/** attendees/{uid}: the "App users" list (created by the person's phone; firestore.rules check it). */
export interface Attendee {
  firstName: string
  lastName: string
  email: string
  emailLower: string
  /** ticked "Yes, AFRIFF can email me festival news and updates" (now): gets festival emails */
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
}

/** The database, as the logic needs it. */
export interface AttendeeStore {
  /** Deletes attendees/{uid} and attendeePlans/{uid}. */
  remove(uid: string): Promise<void>
  /** Has a team profile (users/{uid}): their sign-in is also their staff login. */
  isStaff(uid: string): Promise<boolean>
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
