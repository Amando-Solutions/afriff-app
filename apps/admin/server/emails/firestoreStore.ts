// Festival emails in Firestore, through the Admin SDK (which firestore.rules
// don't apply to), for logic.ts. Collections:
//   attendees/{uid}   who said yes (marketing == true); an unsubscribe link
//                     switches it off, the same way the app's switch does.
//   emails/{id}       each email sent from the console and how far it got
//                     (admins read it in the console; only this server writes).
// Reading subscribers in uid order needs no extra index: the database's own
// index on `marketing` is already kept in document order.
import { FieldPath, FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore'
import type { Campaign, CampaignStore } from './types'

const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0)
const time = (v: number) => (v ? Timestamp.fromMillis(v) : null)

function fromDoc(d: DocumentData): Campaign {
  return {
    subject: String(d.subject ?? ''),
    message: String(d.message ?? ''),
    buttonLabel: String(d.buttonLabel ?? ''),
    buttonUrl: String(d.buttonUrl ?? ''),
    status: d.status === 'sent' || d.status === 'paused' ? d.status : 'sending',
    total: Number(d.total) || 0,
    sent: Number(d.sent) || 0,
    failed: Number(d.failed) || 0,
    failures: Array.isArray(d.failures) ? d.failures : [],
    cursor: String(d.cursor ?? ''),
    linkBase: String(d.linkBase ?? ''),
    lockUntil: Number(d.lockUntil) || 0,
    error: String(d.error ?? ''),
    createdBy: String(d.createdBy ?? ''),
    createdByName: String(d.createdByName ?? ''),
    createdAt: ms(d.createdAt),
    finishedAt: ms(d.finishedAt),
  }
}

export function firestoreCampaigns(db: Firestore): CampaignStore {
  const subscribers = () => db.collection('attendees').where('marketing', '==', true)
  const ref = (id: string) => db.doc(`emails/${id}`)

  return {
    async countSubscribers() {
      return (await subscribers().count().get()).data().count
    },

    async subscribersAfter(cursor, limit) {
      let q = subscribers().orderBy(FieldPath.documentId()).limit(limit)
      if (cursor) q = q.startAfter(cursor)
      const snap = await q.get()
      return snap.docs.map((d) => ({ uid: d.id, email: String(d.get('email') ?? '').trim(), firstName: String(d.get('firstName') ?? '').trim() }))
    },

    async create(c) {
      const doc = db.collection('emails').doc()
      await doc.create({ ...c, createdAt: time(c.createdAt), finishedAt: null })
      return doc.id
    },

    async get(id) {
      const snap = await ref(id).get()
      return snap.exists ? fromDoc(snap.data()!) : null
    },

    async claim(id, now, until) {
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref(id))
        if (!snap.exists) return null
        const c = fromDoc(snap.data()!)
        if (c.status === 'sent') return c
        if (c.lockUntil > now) return 'busy' as const
        tx.update(ref(id), { status: 'sending', error: '', lockUntil: until })
        return { ...c, status: 'sending' as const, error: '', lockUntil: until }
      })
    },

    async progress(id, p) {
      await ref(id).update(p)
    },

    async finish(id, patch) {
      const { finishedAt, ...rest } = patch
      await ref(id).update(finishedAt === undefined ? rest : { ...rest, finishedAt: time(finishedAt) })
    },

    async unsubscribe(uid) {
      const attendee = db.doc(`attendees/${uid}`)
      const snap = await attendee.get()
      if (!snap.exists || snap.get('marketing') !== true) return
      await attendee.update({ marketing: false, consentText: '', marketingChangedAt: FieldValue.serverTimestamp() })
    },
  }
}
