// Attendee accounts in Firestore, through the Admin SDK (which firestore.rules
// don't apply to). Collections:
//   attendees/{uid}          the "App users" list: name, email, email choice.
//                            Admins can read it in the console; the person can read their own.
//   attendeeSecrets/{uid}    scrambled PIN, wrong-PIN count, pause, emailed code.
//                            No rule: no app can ever read it, only this server.
//   attendeeEmails/{key}     one per email ({ uid }), so an email can't sign up twice.
//                            No rule: server only. The key is a scramble of the email.
//   attendeePlans/{uid}      their My Festival (written by their phone; deleted with the account).
//   authLimits/{key}         wrong tries per network (no IP stored). No rule: server only.
//                            Each has an expireAt; a Firestore TTL policy on it (optional)
//                            clears old ones by itself.
import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore'
import { AccountError, type AccountStore, type Attendee, type Secret } from './types'

const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0)
const TIME_FIELDS = ['createdAt', 'lastLoginAt', 'marketingChangedAt'] as const

/** times as real dates in the database (readable in the Firebase console, sortable) */
function toDoc(a: Partial<Attendee>): DocumentData {
  const out: DocumentData = { ...a }
  for (const f of TIME_FIELDS) if (typeof a[f] === 'number') out[f] = a[f] ? Timestamp.fromMillis(a[f]) : null
  return out
}

function fromDoc(d: DocumentData): Attendee {
  return {
    firstName: String(d.firstName ?? ''),
    lastName: String(d.lastName ?? ''),
    email: String(d.email ?? ''),
    emailLower: String(d.emailLower ?? ''),
    marketing: d.marketing === true,
    optInAtSignUp: d.optInAtSignUp === 1 ? 1 : 0,
    consentText: String(d.consentText ?? ''),
    marketingChangedAt: ms(d.marketingChangedAt),
    createdAt: ms(d.createdAt),
    createdDay: String(d.createdDay ?? ''),
    lastLoginAt: ms(d.lastLoginAt),
    brevo: d.brevo ?? 'off',
    brevoError: String(d.brevoError ?? ''),
  }
}

function secretFrom(d: DocumentData): Secret {
  return {
    pin: String(d.pin ?? ''),
    fails: Number(d.fails) || 0,
    lockedUntil: Number(d.lockedUntil) || 0,
    needsReset: d.needsReset === true,
    code: d.code && typeof d.code === 'object' ? { hash: String(d.code.hash), expiresAt: Number(d.code.expiresAt) || 0, tries: Number(d.code.tries) || 0 } : null,
    codesSent: Array.isArray(d.codesSent) ? d.codesSent.map(Number).filter(Number.isFinite) : [],
  }
}

export function firestoreStore(db: Firestore): AccountStore {
  const attendeeRef = (uid: string) => db.doc(`attendees/${uid}`)
  const secretRef = (uid: string) => db.doc(`attendeeSecrets/${uid}`)
  const emailRef = (key: string) => db.doc(`attendeeEmails/${key}`)

  return {
    async uidForEmail(key) {
      const snap = await emailRef(key).get()
      return snap.exists ? String(snap.get('uid')) : null
    },

    create(uid, key, attendee, secret) {
      return db.runTransaction(async (tx) => {
        if ((await tx.get(emailRef(key))).exists) return false
        tx.create(emailRef(key), { uid })
        tx.create(attendeeRef(uid), toDoc(attendee))
        tx.create(secretRef(uid), secret)
        return true
      })
    },

    async attendee(uid) {
      const snap = await attendeeRef(uid).get()
      return snap.exists ? fromDoc(snap.data()!) : null
    },

    async updateAttendee(uid, patch) {
      await attendeeRef(uid).update(toDoc(patch))
    },

    updateSecret(uid, change) {
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(secretRef(uid))
        if (!snap.exists) throw new AccountError(404, 'This account no longer exists.', { reason: 'gone' })
        const { next, result } = await change(secretFrom(snap.data()!))
        if (next) tx.set(secretRef(uid), next)
        return result
      })
    },

    remove(uid, key) {
      return db.runTransaction(async (tx) => {
        const email = key ? await tx.get(emailRef(key)) : null
        if (email?.exists && email.get('uid') === uid) tx.delete(emailRef(key!))
        tx.delete(attendeeRef(uid))
        tx.delete(secretRef(uid))
        tx.delete(db.doc(`attendeePlans/${uid}`))
      })
    },

    // Approximate on purpose (no transaction): many phones share one network,
    // and a limit doesn't need to be exact to work.
    async count(key, windowMs, add, now) {
      const ref = db.doc(`authLimits/${key}`)
      const snap = await ref.get()
      const start = Number(snap.get('windowStart')) || 0
      if (!snap.exists || now - start > windowMs) {
        if (add) await ref.set({ windowStart: now, count: add, expireAt: Timestamp.fromMillis(now + windowMs) })
        return add
      }
      if (add) await ref.update({ count: FieldValue.increment(add) })
      return (Number(snap.get('count')) || 0) + add
    },

    async waitingForBrevo(limit) {
      const snap = await db.collection('attendees').where('brevo', 'in', ['pending', 'failed']).limit(limit).get()
      return snap.docs.map((d) => ({ uid: d.id, attendee: fromDoc(d.data()) }))
    },
  }
}
