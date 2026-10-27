// Festival emails, the staff app's server side: the shapes, and what the logic
// (logic.ts) needs from the database and from the email service. Kept apart
// from Firebase and Brevo so the logic can be tested with a pretend database
// and a pretend Brevo (test/emails.test.ts); the real ones are
// firestoreStore.ts and brevo.ts.
import type { EmailDraft } from '../../shared/festivalEmail'

/** Someone who said yes to festival emails (attendees/{uid} with marketing on). */
export interface Subscriber {
  uid: string
  email: string
  firstName: string
}

/**
 * emails/{id}: one festival email and how far sending it got.
 *   sending  being sent, or stopped half-way because the console was closed
 *            ("Continue sending" picks it up)
 *   paused   the email service refused (e.g. Brevo's free plan's daily limit);
 *            `error` says why, "Continue sending" tries again
 *   sent     everyone who said yes has had it
 */
export type CampaignStatus = 'sending' | 'paused' | 'sent'

export interface Campaign extends EmailDraft {
  status: CampaignStatus
  /** how many said yes when it was started (people can join or leave while it goes out) */
  total: number
  sent: number
  failed: number
  /** a few addresses the email service refused, with its reason, for the admin to check */
  failures: { email: string; reason: string }[]
  /** subscribers are sent in uid order; the last uid done ('' = none yet) */
  cursor: string
  /** the staff app's address when it was started: the start of every unsubscribe link */
  linkBase: string
  /** one sender at a time: until when (ms) the current one holds it (0 = nobody) */
  lockUntil: number
  error: string
  createdBy: string
  createdByName: string
  createdAt: number
  finishedAt: number
}

/** The database, as the logic needs it. */
export interface CampaignStore {
  countSubscribers(): Promise<number>
  /** the next people who said yes after `cursor`, in uid order */
  subscribersAfter(cursor: string, limit: number): Promise<Subscriber[]>
  create(c: Campaign): Promise<string>
  get(id: string): Promise<Campaign | null>
  /**
   * Take the campaign for sending until `until` (ms), unless someone else holds
   * it. Returns it, 'busy' if someone else is sending it, or null if there's no such email.
   */
  claim(id: string, now: number, until: number): Promise<Campaign | 'busy' | null>
  /** after each batch: where it got to, how many more went out or failed, and a longer hold */
  progress(id: string, p: { cursor: string; sent: number; failed: number; failures: Campaign['failures']; lockUntil: number }): Promise<void>
  finish(id: string, patch: Partial<Pick<Campaign, 'status' | 'error' | 'finishedAt' | 'lockUntil'>>): Promise<void>
  /** an email's unsubscribe link: festival emails off for attendees/{uid} (nothing if it's gone) */
  unsubscribe(uid: string): Promise<void>
}

/** One email to one person. */
export interface OutgoingEmail {
  to: { email: string; name: string }
  subject: string
  html: string
}

/** The email service (Brevo). */
export interface Mailer {
  readonly ready: boolean
  /** what's missing on the server when it isn't ready, in plain words */
  readonly missing: string[]
  /** "AFRIFF <news@afriff.com>" */
  readonly from: string
  /** Sends every email in one go (all or nothing). Throws MailerError when refused. */
  send(emails: OutgoingEmail[]): Promise<void>
}

/** The email service said no. `status` is its HTTP answer (0 = couldn't reach it), `code` its own error code. */
export class MailerError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = '',
  ) {
    super(message)
  }
}
