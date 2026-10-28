// Invitations (console → Invitations), for admins and editors. A draft is
// written straight to invites/{id} from here (firestore.rules allow only the
// draft's own fields, and only while it's a draft or waiting for approval).
// Everything that sends goes through the staff app's server
// (server/api/invites/*), which lets ONLY ADMINS send, schedule, call off and
// fix addresses. What an invite is: shared/invites.ts.
import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
  type Timestamp, type Unsubscribe,
} from 'firebase/firestore'
import { cleanAudience, cleanInvite, emptyInvite, type Audience, type InviteContent } from '#shared/invites'
import type { SkipReason } from '#shared/contacts'
import { auth, db } from './firebase'
import { adminCall } from './serverCall'
import { useAdminAuth } from './useAdminAuth'

export type InviteStatus = 'draft' | 'review' | 'sending' | 'paused' | 'scheduled' | 'sent'

export interface InviteDoc extends InviteContent {
  id: string
  audience: Audience
  parentId: string
  status: InviteStatus
  /** an admin's note when sending it back to the editor */
  reviewNote: string
  scheduledAt: number
  total: number
  sent: number
  failed: number
  failures: { email: string; reason: string }[]
  runs: number
  lockUntil: number
  error: string
  groupNames: string[]
  unsubscribed: number
  /** guests whose phones also got a push notification (signed in to the app, alerts on) */
  pushed: number
  /** a scheduled invite's pushes are due then (ms); the Cloud Function sets it back to 0 once sent */
  pushAt: number
  createdBy: string
  createdByName: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  updatedByName: string
  sentByName: string
  sentAt: number
  finishedAt: number
}

const STATUSES: InviteStatus[] = ['draft', 'review', 'sending', 'paused', 'scheduled', 'sent']
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function inviteFrom(id: string, d: Record<string, unknown>): InviteDoc {
  return {
    ...cleanInvite(d),
    id,
    audience: cleanAudience(d.audience),
    parentId: String(d.parentId ?? ''),
    status: STATUSES.includes(d.status as InviteStatus) ? (d.status as InviteStatus) : 'draft',
    reviewNote: String(d.reviewNote ?? ''),
    scheduledAt: num(d.scheduledAt),
    total: num(d.total), sent: num(d.sent), failed: num(d.failed),
    failures: Array.isArray(d.failures) ? (d.failures as InviteDoc['failures']) : [],
    runs: num(d.runs), lockUntil: num(d.lockUntil), error: String(d.error ?? ''),
    groupNames: Array.isArray(d.groupNames) ? (d.groupNames as string[]) : [],
    unsubscribed: num(d.unsubscribed),
    pushed: num(d.pushed),
    pushAt: num(d.pushAt),
    createdBy: String(d.createdBy ?? ''), createdByName: String(d.createdByName ?? ''),
    createdAt: (d.createdAt as Timestamp | null) ?? null, updatedAt: (d.updatedAt as Timestamp | null) ?? null,
    updatedByName: String(d.updatedByName ?? ''),
    sentByName: String(d.sentByName ?? ''), sentAt: num(d.sentAt), finishedAt: num(d.finishedAt),
  }
}

/** A scheduled invite whose time has come has, as far as anyone can tell, gone. */
export const shownStatus = (c: Pick<InviteDoc, 'status' | 'scheduledAt'>, now = Date.now()): InviteStatus =>
  c.status === 'scheduled' && c.scheduledAt <= now ? 'sent' : c.status

export const editable = (c: Pick<InviteDoc, 'status'>) => c.status === 'draft' || c.status === 'review'

export function watchInvites(onList: (l: InviteDoc[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'invites'), orderBy('createdAt', 'desc'), limit(60)), (snap) => onList(snap.docs.map((d) => inviteFrom(d.id, d.data()))), onError)
}

export function watchInvite(id: string, onInvite: (c: InviteDoc | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(doc(db, 'invites', id), (snap) => onInvite(snap.exists() ? inviteFrom(snap.id, snap.data()) : null), onError)
}

const me = () => ({ uid: auth.currentUser?.uid ?? '', name: useAdminAuth().profile?.name || auth.currentUser?.email || '' })

/** A new draft (or, from a sent invite, a change-of-plan update to its guests). Returns its id. */
export async function createInvite(from?: InviteDoc): Promise<string> {
  const content = from
    ? { ...emptyInvite('update'), event: { ...from.event } }
    : emptyInvite('invite')
  const { uid, name } = me()
  const ref = await addDoc(collection(db, 'invites'), {
    ...content,
    parentId: from?.id ?? '',
    audience: { groups: [], people: [], exclude: [] },
    status: 'draft', reviewNote: '',
    createdBy: uid, createdByName: name, createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(), updatedBy: uid, updatedByName: name,
  })
  return ref.id
}

/** Saves what's in the form (only while it's a draft or waiting for approval). */
export async function saveInvite(id: string, content: InviteContent, audience: Audience) {
  const { uid, name } = me()
  await updateDoc(doc(db, 'invites', id), { ...cleanInvite(content), audience: cleanAudience(audience), updatedAt: serverTimestamp(), updatedBy: uid, updatedByName: name })
}

/** Editor → "Ask an admin to approve"; admin → "Send back" with a note. */
export async function setReview(id: string, status: 'draft' | 'review', note = '') {
  const { uid, name } = me()
  await updateDoc(doc(db, 'invites', id), { status, reviewNote: note.trim().slice(0, 500), updatedAt: serverTimestamp(), updatedBy: uid, updatedByName: name })
}

export const deleteInvite = (id: string) => deleteDoc(doc(db, 'invites', id))

// ---------- The server: Brevo, counting, testing, sending ----------

export interface InviteSetup { ready: boolean; missing: string[]; from: string }
export interface Count {
  status: InviteStatus
  send: number
  newPeople: number
  skipped: Partial<Record<SkipReason, number>>
  skippedPeople: { name: string; email: string; reason: SkipReason }[]
  excluded: number
  duplicates: number
}
export interface Stats {
  stats: { requests: number; delivered: number; uniqueOpens: number; hardBounces: number; softBounces: number; blocked: number; invalid: number } | null
  problems: { email: string; kind: 'hardBounces' | 'softBounces' | 'blocked' | 'invalid'; reason: string; date: string; key: string; name: string; fixedTo: string; queued: boolean }[]
  queued: number
  unsubscribed: number
}
export interface SendProgress { id: string; status: InviteStatus; total: number; sent: number; failed: number; pushed: number; scheduledAt: number; more: boolean; error: string }

export const inviteSetup = () => adminCall<InviteSetup>('/api/invites/setup')
/**
 * Push notifications for SCHEDULED invites come from the Cloud Function
 * pushScheduledInvites (functions/src/invites/), which notes in
 * sync/invitePushes when it last ran: at least every 10 minutes. Admins only
 * (firestore.rules); 0 = never ran (not deployed yet, e.g. before Blaze).
 */
export function watchScheduledPushes(onCheckedAt: (ms: number) => void): Unsubscribe {
  return onSnapshot(doc(db, 'sync', 'invitePushes'), (snap) => onCheckedAt(num(snap.data()?.checkedAt)), () => onCheckedAt(0))
}

/** it ran in the last 15 minutes */
export const scheduledPushesRunning = (checkedAt: number, now = Date.now()) => checkedAt > 0 && now - checkedAt < 15 * 60_000

/** A scheduled invite's pushes still not sent 5 minutes after its time: the Cloud Function isn't running. */
export const pushesOverdue = (c: Pick<InviteDoc, 'pushAt'>, now = Date.now()) => c.pushAt > 0 && now - c.pushAt > 5 * 60_000
export const countGuests = (id: string) => adminCall<Count>('/api/invites/count', { id })
export const sendTest = (id: string, to: string) => adminCall<{ to: string[] }>('/api/invites/test', { id, to })
export const loadStats = (id: string) => adminCall<Stats>('/api/invites/stats', { id })
export const fixAddress = (id: string, key: string, email: string) => adminCall<{ contactUpdated: boolean }>('/api/invites/fix', { id, key, email })
export const cancelSchedule = (id: string) => adminCall<{ status: 'review' }>('/api/invites/cancel', { id })

/**
 * Admins: sends (mode all / new / resend), or carries on with one already
 * started (`continue`). The server sends for a few seconds per call; this keeps
 * calling while there's more, reporting progress after each call.
 */
export async function sendInvite(id: string, how: { mode: 'all' | 'new' | 'resend'; scheduledAt?: number } | 'continue', onProgress: (p: SendProgress) => void): Promise<SendProgress> {
  let p = how === 'continue'
    ? await adminCall<SendProgress>('/api/invites/continue', { id })
    : await adminCall<SendProgress>('/api/invites/send', { id, ...how })
  onProgress(p)
  for (let round = 0; p.more && round < 500; round++) {
    p = await adminCall<SendProgress>('/api/invites/continue', { id })
    onProgress(p)
  }
  return p
}

// ---------- The guest list (admins) ----------

export interface Guest {
  key: string
  firstName: string
  lastName: string
  email: string
  groups: string[]
  vip: boolean
  addedByAfriff: boolean
  status: 'queued' | 'sent' | 'failed'
  unsubscribed: boolean
}

export async function loadGuests(id: string): Promise<Guest[]> {
  const snap = await getDocs(collection(db, 'invites', id, 'recipients'))
  return snap.docs.map((d) => {
    const g = d.data()
    return {
      key: d.id, firstName: String(g.firstName ?? ''), lastName: String(g.lastName ?? ''), email: String(g.email ?? ''),
      groups: Array.isArray(g.groups) ? g.groups : [], vip: g.vip === true, addedByAfriff: g.addedByAfriff === true,
      status: g.status === 'sent' || g.status === 'failed' ? g.status : 'queued', unsubscribed: Boolean(g.unsubscribedAt),
    }
  })
}

// ---------- Lagos time for scheduling ----------

/** "2026-10-29T09:00" typed in Lagos time → ms (Lagos is UTC+1 all year) */
export const lagosInputToMs = (v: string) => (/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(v) ? Date.parse(`${v}:00Z`) - 3_600_000 : NaN)
/** ms → the datetime-local box's value, in Lagos time */
export const msToLagosInput = (ms: number) => new Date(ms + 3_600_000).toISOString().slice(0, 16)
export const lagosText = (ms: number) => (ms ? new Date(ms).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '')
