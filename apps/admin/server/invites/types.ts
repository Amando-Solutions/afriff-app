// Invitations, the staff app's server side: the shapes, and what the logic
// (logic.ts) needs from the database and from Brevo. Kept apart from Firebase
// and Brevo so the logic can be tested with a pretend database and a pretend
// Brevo (test/invites.test.ts); the real ones are firestoreStore.ts and brevo.ts.
import type { Person } from '../../shared/contacts'
import type { Audience, InviteContent } from '../../shared/invites'

/**
 * invites/{id}.status
 *   draft      being written (editors and admins, in the console)
 *   review     an editor asked an admin to approve and send it
 *   sending    being handed to Brevo, or stopped half-way because the console
 *              was closed ("Continue sending" picks it up)
 *   paused     Brevo refused (e.g. the free plan's daily limit); `error` says why
 *   scheduled  all handed to Brevo, which sends at `scheduledAt`
 *   sent       everyone on it has had it
 * Only the server moves an invite past review, and only for an admin.
 */
export type InviteStatus = 'draft' | 'review' | 'sending' | 'paused' | 'scheduled' | 'sent'

export interface InviteRecord extends InviteContent {
  id: string
  audience: Audience
  /** an update: the sent invite whose guests it goes to */
  parentId: string
  status: InviteStatus
  /** ms; 0 = send straight away */
  scheduledAt: number
  /** Brevo's handle on a scheduled send (to call it off) */
  batchId: string
  /** guests on it so far (every run), sent or not */
  total: number
  sent: number
  failed: number
  /** a few addresses Brevo turned down, with its reason */
  failures: { email: string; reason: string }[]
  /** how many sends: 1 = the first; "new people only" and resends add one each */
  runs: number
  /** one sender at a time: until when (ms) the current one holds it */
  lockUntil: number
  error: string
  /** the staff app's address when first sent: the start of every guest's links */
  linkBase: string
  /** the groups' names when it was sent, for the log */
  groupNames: string[]
  unsubscribed: number
  createdByName: string
  sentByName: string
  sentAt: number
  finishedAt: number
}

/** invites/{id}/recipients/{key}: one guest of one invite (the guest list) */
export interface RecipientRecord {
  key: string
  uid: string
  email: string
  firstName: string
  lastName: string
  /** names of their groups this invite went to (or all their groups, if picked one by one) */
  groups: string[]
  vip: boolean
  addedByAfriff: boolean
  status: 'queued' | 'sent' | 'failed'
  reason: string
  run: number
  sentAt: number
  /** the address it first went to, when an admin fixed a bounced one */
  fixedFrom: string
  unsubscribedAt: number
}

/** The database, as the logic needs it. */
export interface InviteStore {
  get(id: string): Promise<InviteRecord | null>
  /**
   * In one step: check the invite is in one of `from` and nobody holds it,
   * then apply `patch` and hold it until `until`. Returns it (after the
   * patch), 'busy', 'wrong-status', or null if there's no such invite.
   */
  begin(id: string, from: InviteStatus[], now: number, until: number, patch: Partial<InviteRecord>): Promise<InviteRecord | 'busy' | 'wrong-status' | null>
  update(id: string, patch: Partial<InviteRecord>): Promise<void>
  groupNames(): Promise<Record<string, string>>
  /** members of these groups, plus these people (by key), as merged contacts */
  people(groups: string[], keys: string[]): Promise<Person[]>
  recipients(id: string): Promise<RecipientRecord[]>
  addRecipients(id: string, list: RecipientRecord[]): Promise<void>
  /** the next guests still to send to, in key order */
  queued(id: string, limit: number): Promise<RecipientRecord[]>
  setRecipients(id: string, changes: { key: string; patch: Partial<RecipientRecord> }[]): Promise<void>
  deleteRecipients(id: string): Promise<void>
  /**
   * A hand-added guest's email was fixed: move their contact to the new
   * email (joining an existing contact there). False = nothing to move.
   */
  moveContact(fromKey: string, toEmail: string): Promise<boolean>
  /**
   * An invite's unsubscribe link: emails off for this guest (their app account
   * and AFRIFF's record of them). True the first time for this invite.
   */
  unsubscribe(inviteId: string, key: string, now: number): Promise<boolean>
}

export interface OneEmail {
  to: { email: string; name: string }
  subject: string
  /** the whole email, made for this guest (shared/invites.ts renderInvite) */
  html: string
}

export interface Batch {
  /** every email carries it: Brevo's statistics for this invite are found by it */
  tag: string
  emails: OneEmail[]
  /** ISO time: Brevo holds them until then (at most 72 hours ahead) */
  scheduledAt?: string
  batchId?: string
}

export interface InviteStats {
  requests: number
  delivered: number
  uniqueOpens: number
  hardBounces: number
  softBounces: number
  blocked: number
  invalid: number
}

export interface DeliveryProblem {
  email: string
  kind: 'hardBounces' | 'softBounces' | 'blocked' | 'invalid'
  reason: string
  date: string
}

/** Brevo, as invitations need it: it only delivers (the email is ours). */
export interface InviteMailer {
  readonly ready: boolean
  readonly missing: string[]
  /** "AFRIFF <invites@afriff.app>" */
  readonly from: string
  /** One batch in one request (all or nothing). Throws MailerError when refused. */
  send(b: Batch): Promise<void>
  /** calls off a scheduled batch */
  cancel(batchId: string): Promise<void>
  stats(tag: string): Promise<InviteStats>
  problems(tag: string): Promise<DeliveryProblem[]>
}
