// The real database and push service for push.ts (Firebase Admin SDK: full
// access, security rules don't apply). Collections, as the staff app keeps them
// (apps/admin/server/invites/firestoreStore.ts, server/utils/pushDevices.ts):
//   invites/{id}                  pushAt, pushLockUntil (this function's hold),
//                                 lockUntil (the staff app's), pushed, status
//   invites/{id}/recipients/{key} status, uid, pushedAt, unsubscribedAt
//   pushTokens/{sha256 of token}  { uid, token }: phones linked to accounts
//   sync/invitePushes             when this function last ran
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { Messaging } from 'firebase-admin/messaging'
import { STATUS_DOC, type Data, type PushStore, type Sender, type SendResult } from './push'

/** FCM's answers for a push address that no longer works (as pushDevices.ts) */
const GONE = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const chunks = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

export function firestorePushStore(db: Firestore): PushStore {
  const invite = (id: string) => db.doc(`invites/${id}`)
  const guests = (id: string) => db.collection(`invites/${id}/recipients`)

  return {
    async due(now) {
      // one field, a range: no extra index needed. A handful at most per minute.
      const snap = await db.collection('invites').where('pushAt', '>', 0).where('pushAt', '<=', now).limit(20).get()
      return snap.docs.map((d) => d.id)
    },

    async claim(id, now, until) {
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(invite(id))
        const d = snap.data() as Data | undefined
        if (!d) return null
        const pushAt = num(d.pushAt)
        if (pushAt <= 0 || pushAt > now || num(d.pushLockUntil) > now || num(d.lockUntil) > now) return null
        tx.update(snap.ref, { pushLockUntil: until })
        return d
      })
    },

    async sentGuests(id) {
      const snap = await guests(id).where('status', '==', 'sent').get()
      return snap.docs.map((d) => ({ key: d.id, uid: str(d.get('uid')), pushedAt: num(d.get('pushedAt')), unsubscribedAt: num(d.get('unsubscribedAt')) }))
    },

    async phonesOf(uids) {
      const phones = []
      // "in" takes 30 values at a time
      for (const part of chunks(uids, 30)) {
        const snap = await db.collection('pushTokens').where('uid', 'in', part).get()
        for (const d of snap.docs) phones.push({ id: d.id, uid: str(d.get('uid')), token: str(d.get('token')) })
      }
      return phones.filter((p) => p.token)
    },

    async finish(id, keys, at) {
      for (const part of chunks(keys, 400)) {
        const b = db.batch()
        for (const key of part) b.update(guests(id).doc(key), { pushedAt: at })
        await b.commit()
      }
      await invite(id).update({ pushAt: 0, pushLockUntil: 0, ...(keys.length ? { pushed: FieldValue.increment(keys.length) } : {}) })
    },

    async unlink(phoneIds) {
      for (const part of chunks(phoneIds, 400)) {
        const b = db.batch()
        for (const p of part) b.delete(db.doc(`pushTokens/${p}`))
        await b.commit()
      }
    },

    async status(s) {
      await db.doc(STATUS_DOC).set(s, { merge: true })
    },
  }
}

/** One FCM message per phone, the same message the staff app sends (pushDevices.ts pushToPeople). */
export function fcmSender(messaging: Messaging): Sender {
  return async (phones, push) => {
    const out: SendResult[] = []
    for (const part of chunks(phones, 500)) {
      const res = await messaging.sendEach(part.map((p) => ({
        token: p.token,
        webpush: { headers: { TTL: String(push.ttlSeconds), Urgency: 'high' }, data: push.data },
      })))
      for (const r of res.responses) out.push(r.success ? 'sent' : GONE.has(r.error?.code ?? '') ? 'gone' : 'failed')
    }
    return out
  }
}
