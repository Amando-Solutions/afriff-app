// Invitations in Firestore, through the Admin SDK (which firestore.rules don't
// apply to), for logic.ts. Collections:
//   invites/{id}                  each invite: what's in it (written by the
//                                 console while a draft), and how sending went
//                                 (only this server writes that part)
//   invites/{id}/recipients/{key} its guests: the guest list (admins read it)
//   contacts/{key}, attendees/{uid}, groups/{id}: who the guests are
//                                 (shared/contacts.ts joins them by email)
// Times the server writes are in ms; the console's own (createdAt, updatedAt)
// are Firestore times.
import { FieldPath, FieldValue, Timestamp, type DocumentData, type Firestore, type WriteBatch } from 'firebase-admin/firestore'
import { contactFrom, contactKey, mergePeople, type AttendeeFacts, type ContactRecord } from '../../shared/contacts'
import { cleanAudience, cleanInvite } from '../../shared/invites'
import type { InviteRecord, InviteStatus, InviteStore, RecipientRecord } from './types'

const STATUSES: InviteStatus[] = ['draft', 'review', 'sending', 'paused', 'scheduled', 'sent']
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : v instanceof Timestamp ? v.toMillis() : 0)
const s = (v: unknown) => (typeof v === 'string' ? v : '')
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function inviteFrom(id: string, d: DocumentData): InviteRecord {
  return {
    ...cleanInvite(d),
    id,
    audience: cleanAudience(d.audience),
    parentId: s(d.parentId),
    status: STATUSES.includes(d.status) ? d.status : 'draft',
    scheduledAt: n(d.scheduledAt),
    pushAt: n(d.pushAt),
    batchId: s(d.batchId),
    total: n(d.total), sent: n(d.sent), failed: n(d.failed),
    failures: Array.isArray(d.failures) ? d.failures : [],
    runs: n(d.runs),
    lockUntil: n(d.lockUntil),
    error: s(d.error),
    linkBase: s(d.linkBase),
    groupNames: strings(d.groupNames),
    unsubscribed: n(d.unsubscribed),
    pushed: n(d.pushed),
    createdByName: s(d.createdByName),
    sentByName: s(d.sentByName),
    sentAt: n(d.sentAt),
    finishedAt: n(d.finishedAt),
  }
}

function recipientFrom(key: string, d: DocumentData): RecipientRecord {
  return {
    key, uid: s(d.uid), email: s(d.email), firstName: s(d.firstName), lastName: s(d.lastName),
    groups: strings(d.groups), vip: d.vip === true, addedByAfriff: d.addedByAfriff === true,
    status: d.status === 'sent' || d.status === 'failed' ? d.status : 'queued',
    reason: s(d.reason), run: n(d.run), sentAt: n(d.sentAt), fixedFrom: s(d.fixedFrom), unsubscribedAt: n(d.unsubscribedAt),
    pushedAt: n(d.pushedAt),
  }
}

function attendeeFrom(id: string, d: DocumentData): AttendeeFacts {
  return { uid: id, firstName: s(d.firstName), lastName: s(d.lastName), email: s(d.email), marketing: d.marketing === true, createdAt: n(d.createdAt) }
}

const chunks = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

export function firestoreInvites(db: Firestore): InviteStore {
  const ref = (id: string) => db.doc(`invites/${id}`)
  const guests = (id: string) => db.collection(`invites/${id}/recipients`)

  /** many writes, in batches Firestore accepts */
  async function inBatches<T>(items: T[], write: (b: WriteBatch, item: T) => void) {
    for (const part of chunks(items, 400)) {
      const b = db.batch()
      for (const item of part) write(b, item)
      await b.commit()
    }
  }

  return {
    async get(id) {
      const snap = await ref(id).get()
      return snap.exists ? inviteFrom(id, snap.data()!) : null
    },

    async begin(id, from, now, until, patch) {
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref(id))
        if (!snap.exists) return null
        const c = inviteFrom(id, snap.data()!)
        if (!from.includes(c.status)) return 'wrong-status' as const
        if (c.lockUntil > now) return 'busy' as const
        tx.update(ref(id), { ...patch, lockUntil: until })
        return { ...c, ...patch, lockUntil: until }
      })
    },

    async update(id, patch) {
      await ref(id).update(patch)
    },

    async groupNames() {
      const snap = await db.collection('groups').get()
      return Object.fromEntries(snap.docs.map((d) => [d.id, s(d.get('name')) || d.id]))
    },

    async people(groups, keys) {
      const contacts = new Map<string, ContactRecord>()
      // "array-contains-any" takes 30 values at a time
      for (const part of chunks(groups, 30)) {
        const snap = await db.collection('contacts').where('groups', 'array-contains-any', part).get()
        for (const d of snap.docs) contacts.set(d.id, contactFrom(d.id, d.data()))
      }
      const wanted = [...new Set(keys)].filter((k) => k && !k.includes('/') && !contacts.has(k))
      for (const part of chunks(wanted, 100)) {
        const snaps = await db.getAll(...part.map((k) => db.doc(`contacts/${k}`)))
        for (const d of snaps) if (d.exists) contacts.set(d.id, contactFrom(d.id, d.data()!))
      }
      // their app accounts, by email ("in" takes 30 values at a time)
      const emails = [...new Set([...contacts.keys(), ...wanted])]
      const attendees: AttendeeFacts[] = []
      for (const part of chunks(emails, 30)) {
        const snap = await db.collection('attendees').where('emailLower', 'in', part).get()
        for (const d of snap.docs) attendees.push(attendeeFrom(d.id, d.data()))
      }
      return mergePeople(attendees, [...contacts.values()])
    },

    async recipients(id) {
      const snap = await guests(id).get()
      return snap.docs.map((d) => recipientFrom(d.id, d.data()))
    },

    async addRecipients(id, list) {
      await inBatches(list, (b, r) => b.set(guests(id).doc(r.key), r))
    },

    async queued(id, limit) {
      const snap = await guests(id).where('status', '==', 'queued').orderBy(FieldPath.documentId()).limit(limit).get()
      return snap.docs.map((d) => recipientFrom(d.id, d.data()))
    },

    async setRecipients(id, changes) {
      await inBatches(changes, (b, c) => b.update(guests(id).doc(c.key), c.patch))
    },

    async deleteRecipients(id) {
      const snap = await guests(id).select().get()
      await inBatches(snap.docs, (b, d) => b.delete(d.ref))
    },

    async moveContact(fromKey, toEmail) {
      const toKey = contactKey(toEmail)
      if (!toKey || toKey === fromKey || toKey.includes('/')) return false
      return db.runTransaction(async (tx) => {
        const [from, to] = await Promise.all([tx.get(db.doc(`contacts/${fromKey}`)), tx.get(db.doc(`contacts/${toKey}`))])
        if (!from.exists) return false
        const a = from.data()!
        const union = (x: unknown, y: unknown) => [...new Set([...strings(x), ...strings(y)])]
        if (to.exists) {
          const b = to.data()!
          tx.update(to.ref, {
            groups: union(b.groups, a.groups), removedFrom: union(b.removedFrom, a.removedFrom), vip: b.vip === true || a.vip === true,
            previousEmails: union(b.previousEmails, [fromKey]), updatedAt: FieldValue.serverTimestamp(),
          })
        } else {
          tx.set(to.ref, { ...a, email: toEmail.trim(), previousEmails: union(a.previousEmails, [fromKey]), updatedAt: FieldValue.serverTimestamp() })
        }
        tx.delete(from.ref)
        return true
      })
    },

    async unsubscribe(inviteId, key, now) {
      const guest = guests(inviteId).doc(key)
      const snap = await guest.get()
      // the address it went to (an admin may have fixed it): that's whose emails go off
      const emailKey = contactKey(s(snap.get('email')) || key)
      const people = await db.collection('attendees').where('emailLower', '==', emailKey).get()
      for (const d of people.docs) {
        if (d.get('marketing') === true) await d.ref.update({ marketing: false, consentText: '', marketingChangedAt: FieldValue.serverTimestamp() })
      }
      if (!emailKey.includes('/')) {
        const contact = db.doc(`contacts/${emailKey}`)
        const c = await contact.get()
        if (c.exists && !c.get('unsubscribedAt')) await contact.update({ agreed: false, unsubscribedAt: now })
      }
      if (!snap.exists) return false
      return db.runTransaction(async (tx) => {
        const g = await tx.get(guest)
        if (!g.exists || g.get('unsubscribedAt')) return false
        tx.update(guest, { unsubscribedAt: now })
        tx.update(ref(inviteId), { unsubscribed: FieldValue.increment(1) })
        return true
      })
    },
  }
}
