// Admins: festival emails (console → Festival emails). The console writes the
// email; the staff app's server sends it (server/api/emails/*, through Brevo)
// to everyone who said yes to festival emails in the app, and keeps a record
// of each one in emails/{id} (admins read it here; only the server writes it).
import {
  collection, getCountFromServer, limit, onSnapshot, orderBy, query, where,
  type Timestamp, type Unsubscribe,
} from 'firebase/firestore'
import type { EmailDraft } from '#shared/festivalEmail'
import { db } from './firebase'
import { adminCall } from './serverCall'

export interface EmailSetup {
  ready: boolean
  /** what the server still needs, in plain words */
  missing: string[]
  /** "AFRIFF <news@afriff.com>" */
  from: string
}

export type EmailStatus = 'sending' | 'paused' | 'sent'

export interface SentEmail extends EmailDraft {
  id: string
  status: EmailStatus
  total: number
  sent: number
  failed: number
  failures: { email: string; reason: string }[]
  /** someone is sending it right now (until this time, ms) */
  lockUntil: number
  error: string
  createdByName: string
  createdAt: Timestamp | null
  finishedAt: Timestamp | null
}

export interface SendProgress {
  id: string
  status: EmailStatus
  total: number
  sent: number
  failed: number
  more: boolean
  error: string
}

/** Can the server send? null = couldn't reach it. */
export const emailSetup = () => adminCall<EmailSetup>('/api/emails/setup')

/** How many people said yes to festival emails (counted by the database: about one read). */
export async function countSubscribers(): Promise<number> {
  const snap = await getCountFromServer(query(collection(db, 'attendees'), where('marketing', '==', true)))
  return snap.data().count
}

/** "Send me a test": to the signed-in admin only. */
export const sendTest = (draft: EmailDraft) => adminCall<{ to: string }>('/api/emails/test', draft)

/**
 * Sends to everyone, or carries on with one already started (`id`). The
 * server sends for a few seconds per call; this keeps calling while there's
 * more, reporting progress after each call.
 */
export async function sendAll(start: { draft: EmailDraft } | { id: string }, onProgress: (p: SendProgress) => void): Promise<SendProgress> {
  let p = 'draft' in start
    ? await adminCall<SendProgress>('/api/emails/send', start.draft)
    : await adminCall<SendProgress>('/api/emails/continue', { id: start.id })
  onProgress(p)
  for (let round = 0; p.more && round < 500; round++) {
    p = await adminCall<SendProgress>('/api/emails/continue', { id: p.id })
    onProgress(p)
  }
  return p
}

/** The newest emails, live (sending progress shows as it happens). */
export function watchEmails(onList: (list: SentEmail[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'emails'), orderBy('createdAt', 'desc'), limit(20)),
    (snap) => onList(snap.docs.map((d) => {
      const e = d.data()
      return {
        id: d.id,
        subject: String(e.subject ?? ''),
        message: String(e.message ?? ''),
        buttonLabel: String(e.buttonLabel ?? ''),
        buttonUrl: String(e.buttonUrl ?? ''),
        status: (e.status === 'sent' || e.status === 'paused' ? e.status : 'sending') as EmailStatus,
        total: Number(e.total) || 0,
        sent: Number(e.sent) || 0,
        failed: Number(e.failed) || 0,
        failures: Array.isArray(e.failures) ? e.failures : [],
        lockUntil: Number(e.lockUntil) || 0,
        error: String(e.error ?? ''),
        createdByName: String(e.createdByName ?? ''),
        createdAt: (e.createdAt as Timestamp | null) ?? null,
        finishedAt: (e.finishedAt as Timestamp | null) ?? null,
      }
    })),
    onError,
  )
}
