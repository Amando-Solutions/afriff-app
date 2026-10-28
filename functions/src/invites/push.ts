// Push notifications for SCHEDULED invitations (console → Invitations → Schedule…).
//
// "Send now" pushes go from the staff app's server as each batch is handed to
// Brevo (apps/admin/server/invites/logic.ts). A scheduled invite's emails wait
// at Brevo until their time, and nothing in the staff app runs then. So the
// staff app marks the invite with `pushAt` (its time), and pushScheduledInvites
// (index.ts, every minute) sends its pushes once that time has come:
//   - to the same people, by the same rule: guests handed to Brevo (status
//     "sent") with an app account, signed in on a phone with "Alerts on this
//     phone" (pushTokens, linked by the staff app: server/utils/pushDevices.ts),
//     not unsubscribed, not pushed already;
//   - with the same words (apps/admin/shared/push.ts invitePush);
//   - once: each guest gets pushedAt, the invite counts them (`pushed`, shown in
//     the console) and `pushAt` goes back to 0.
// One run at a time per invite (a 2-minute hold, `pushLockUntil`), and not
// while the staff app is still handing emails to Brevo (its `lockUntil`). If
// sending fails outright, the hold runs out and the next run tries again.
// More than 3 hours late (e.g. the function was only deployed later), the
// pushes are dropped: the email has long arrived.
//
// sync/invitePushes = { checkedAt, last }: when this last ran (written at most
// every 10 minutes, and whenever it pushed), so the console can tell admins
// whether scheduled invites will get their pushes.
import { cleanInvite } from '../../../apps/admin/shared/invites'
import { invitePush, type PersonalPush } from '../../../apps/admin/shared/push'

export const STATUS_DOC = 'sync/invitePushes'
/** one run per invite at a time; if a run dies, the next one after this takes over */
export const HOLD_MS = 2 * 60_000
/** later than this after its time, an invite's pushes are dropped */
export const TOO_LATE_MS = 3 * 3_600_000
/** sync/invitePushes is written at least this often (the console says "off" after 15 minutes) */
export const HEARTBEAT_MS = 10 * 60_000

export type Data = Record<string, unknown>

export interface Guest { key: string; uid: string; pushedAt: number; unsubscribedAt: number }
export interface Phone { id: string; uid: string; token: string }
/** gone = the phone's push address no longer works (app removed, alerts blocked): unlink it */
export type SendResult = 'sent' | 'gone' | 'failed'

export interface PushStore {
  /** invites whose pushes are due: 0 < pushAt <= now */
  due(now: number): Promise<string[]>
  /** In one step: still due, nobody else on it, the staff app not sending → held until `until`. Returns the invite, or null. */
  claim(id: string, now: number, until: number): Promise<Data | null>
  /** its guests handed to Brevo (status "sent") */
  sentGuests(id: string): Promise<Guest[]>
  /** the phones linked to these people */
  phonesOf(uids: string[]): Promise<Phone[]>
  /** these guests got it (pushedAt), the invite counts them, and is done (pushAt 0, hold released) */
  finish(id: string, pushedKeys: string[], at: number): Promise<void>
  unlink(phoneIds: string[]): Promise<void>
  status(s: { checkedAt: number; last?: { at: number; invites: Outcome[] } }): Promise<void>
}

export type Sender = (phones: Phone[], push: PersonalPush) => Promise<SendResult[]>

export interface Outcome {
  id: string
  /** guests who could get one (app account, not pushed yet) */
  guests: number
  pushed: number
  skipped?: 'too-late' | 'called-off'
  error?: string
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** what the last status write was, kept between runs while the function stays warm */
export const heartbeat = { last: 0 }

export async function sendScheduledPushes(deps: { store: PushStore; send: Sender; now?: () => number; beat?: { last: number } }): Promise<Outcome[]> {
  const { store, send, now = Date.now, beat = heartbeat } = deps
  const t = now()
  const outcomes: Outcome[] = []

  for (const id of await store.due(t)) {
    try {
      const c = await store.claim(id, t, t + HOLD_MS)
      if (!c) continue
      if (c.status === 'draft' || c.status === 'review') {
        await store.finish(id, [], t)
        outcomes.push({ id, guests: 0, pushed: 0, skipped: 'called-off' })
        continue
      }
      if (t - num(c.pushAt) > TOO_LATE_MS) {
        await store.finish(id, [], t)
        outcomes.push({ id, guests: 0, pushed: 0, skipped: 'too-late' })
        continue
      }
      const guests = (await store.sentGuests(id)).filter((g) => g.uid && !g.pushedAt && !g.unsubscribedAt)
      const phones = guests.length ? await store.phonesOf([...new Set(guests.map((g) => g.uid))]) : []
      const results = phones.length ? await send(phones, invitePush(id, cleanInvite(c), t)) : []
      const reached = new Set<string>()
      const gone: string[] = []
      results.forEach((r, i) => {
        if (r === 'sent') reached.add(phones[i]!.uid)
        else if (r === 'gone') gone.push(phones[i]!.id)
      })
      if (gone.length) await store.unlink(gone)
      const keys = guests.filter((g) => reached.has(g.uid)).map((g) => g.key)
      await store.finish(id, keys, t)
      outcomes.push({ id, guests: guests.length, pushed: keys.length })
    } catch (e) {
      // left due: the hold runs out and the next run tries again
      outcomes.push({ id, guests: 0, pushed: 0, error: e instanceof Error ? e.message : String(e) })
    }
  }

  if (outcomes.length || t - beat.last >= HEARTBEAT_MS) {
    await store.status({ checkedAt: t, ...(outcomes.length ? { last: { at: t, invites: outcomes } } : {}) })
    beat.last = t
  }
  return outcomes
}
