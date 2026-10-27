// Attendee accounts on the server: the shapes, and the two outside services the
// account logic (logic.ts) depends on. Kept apart from Firebase and Brevo so
// the logic can be tested with a pretend database and a pretend mailbox
// (accounts.test.ts); the real ones are firestoreStore.ts and brevo.ts.

/** Where someone stands with the "App subscribers" list in Brevo. */
export type BrevoStatus =
  | 'off' // didn't tick the box: never sent to Brevo
  | 'pending' // ticked, not sent yet (Brevo not set up yet, or waiting for "Send to Brevo")
  | 'sent' // on the list
  | 'confirm-sent' // double opt-in: Brevo emailed them a confirm link; they join once they click it
  | 'removed' // unticked later: taken off the list
  | 'failed' // Brevo refused or was unreachable (brevoError says why); "Send to Brevo" retries

/** attendees/{uid}: the "App users" list. Only admins (and the person) can read it. */
export interface Attendee {
  firstName: string
  lastName: string
  /** as typed (trimmed) */
  email: string
  /** trimmed, lower case: what's compared */
  emailLower: string
  /** ticked "Yes, AFRIFF can email me festival news and updates" (now) */
  marketing: boolean
  /** 1 if ticked when signing up, else 0 (Reports adds these up per day) */
  optInAtSignUp: 0 | 1
  /** the box's exact wording they agreed to, '' when not ticked: the record of consent */
  consentText: string
  /** when they last ticked or unticked it (ms) */
  marketingChangedAt: number
  /** ms */
  createdAt: number
  /** 'YYYY-MM-DD' in Lagos, for sign-ups per day */
  createdDay: string
  /** ms, 0 = never logged in since signing up */
  lastLoginAt: number
  brevo: BrevoStatus
  brevoError: string
}

/** attendeeSecrets/{uid}: never readable from any app (no rule), server only. */
export interface Secret {
  /** the PIN, scrambled one way (pin.ts) */
  pin: string
  /** wrong PINs in a row */
  fails: number
  /** ms; 0 = not paused */
  lockedUntil: number
  /** 10 wrong in a row: only a new PIN by emailed code unlocks it */
  needsReset: boolean
  /** the current emailed code (scrambled), if any */
  code: { hash: string; expiresAt: number; tries: number } | null
  /** when codes were sent (ms), last hour only */
  codesSent: number[]
}

export interface SecretChange<T> {
  next: Secret | null
  result: T
}

/** What the phone gets back about the signed-in person. */
export interface PublicProfile {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
}

export interface Session {
  /** Firebase custom token: the phone signs in to Firebase with it */
  token: string
  profile: PublicProfile
}

/** The database, as the account logic needs it. */
export interface AccountStore {
  uidForEmail(emailKey: string): Promise<string | null>
  /** Creates the account; false if the email is already taken (checked in the same transaction). */
  create(uid: string, emailKey: string, attendee: Attendee, secret: Secret): Promise<boolean>
  attendee(uid: string): Promise<Attendee | null>
  updateAttendee(uid: string, patch: Partial<Attendee>): Promise<void>
  /** Read, change and save a secret in one transaction. `next: null` = nothing to save. Throws 404 if missing. */
  updateSecret<T>(uid: string, change: (s: Secret) => Promise<SecretChange<T>> | SecretChange<T>): Promise<T>
  /** Deletes the account, its secret, its saved plan and its email entry. */
  remove(uid: string, emailKey: string | null): Promise<void>
  /** Adds `add` to a counter that restarts after `windowMs`; returns the count now. */
  count(key: string, windowMs: number, add: number, now: number): Promise<number>
  /** Opted-in people not on the Brevo list yet (or failed), and opted-out ones Brevo failed to remove. */
  waitingForBrevo(limit: number): Promise<{ uid: string; attendee: Attendee }[]>
}

/** Sends the "your code" email. */
export interface Mailer {
  readonly ready: boolean
  sendCode(to: { email: string; name: string }, code: string): Promise<void>
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

/** A problem to show the person, with the HTTP status it's sent with. */
export class AccountError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** for the app: which field to point at, or why (e.g. 'exists', 'paused', 'reset') */
    readonly extra: { field?: string; reason?: string; minutes?: number } = {},
  ) {
    super(message)
  }
}
