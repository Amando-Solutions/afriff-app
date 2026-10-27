// A pretend database, mailbox and Brevo list for the account tests: same
// behaviour as firestoreStore.ts / brevo.ts, kept in memory.
import { AccountError, type AccountStore, type Attendee, type Mailer, type MarketingList, type Secret } from '../types'

export function memoryStore() {
  const attendees = new Map<string, Attendee>()
  const secrets = new Map<string, Secret>()
  const emails = new Map<string, string>()
  const plans = new Map<string, unknown>()
  const counters = new Map<string, { start: number; count: number }>()
  const copy = <T>(v: T): T => structuredClone(v)

  const store: AccountStore = {
    async uidForEmail(key) { return emails.get(key) ?? null },
    async create(uid, key, attendee, secret) {
      if (emails.has(key)) return false
      emails.set(key, uid)
      attendees.set(uid, copy(attendee))
      secrets.set(uid, copy(secret))
      return true
    },
    async attendee(uid) { const a = attendees.get(uid); return a ? copy(a) : null },
    async updateAttendee(uid, patch) {
      const a = attendees.get(uid)
      if (!a) throw new Error(`no attendee ${uid}`)
      attendees.set(uid, { ...a, ...copy(patch) })
    },
    async updateSecret(uid, change) {
      const s = secrets.get(uid)
      if (!s) throw new AccountError(404, 'This account no longer exists.', { reason: 'gone' })
      const { next, result } = await change(copy(s))
      if (next) secrets.set(uid, copy(next))
      return result
    },
    async remove(uid, key) {
      if (key && emails.get(key) === uid) emails.delete(key)
      attendees.delete(uid)
      secrets.delete(uid)
      plans.delete(uid)
    },
    async count(key, windowMs, add, now) {
      const c = counters.get(key)
      if (!c || now - c.start > windowMs) {
        if (add) counters.set(key, { start: now, count: add })
        return add
      }
      c.count += add
      return c.count
    },
    async waitingForBrevo(limit) {
      return [...attendees].filter(([, a]) => a.brevo === 'pending' || a.brevo === 'failed').slice(0, limit).map(([uid, a]) => ({ uid, attendee: copy(a) }))
    },
  }
  return { store, attendees, secrets, emails, plans, counters }
}

export function fakeMail(ready = true) {
  const sent: { email: string; name: string; code: string }[] = []
  let failNext = false
  const mail: Mailer = {
    ready,
    async sendCode(to, code) {
      if (failNext) { failNext = false; throw new Error('mail server down') }
      sent.push({ ...to, code })
    },
  }
  return { mail, sent, failNextSend: () => { failNext = true } }
}

export function fakeList(ready = true, doubleOptIn = false) {
  const members = new Set<string>()
  const forgotten: string[] = []
  let down = false
  const list: MarketingList = {
    ready,
    doubleOptIn,
    async add({ email }) { if (down) throw new Error('Brevo answered 503'); members.add(email); return doubleOptIn ? 'confirm-sent' : 'sent' },
    async remove(email) { if (down) throw new Error('Brevo answered 503'); members.delete(email) },
    async forget(email) { if (down) throw new Error('Brevo answered 503'); members.delete(email); forgotten.push(email) },
  }
  return { list, members, forgotten, setDown: (v: boolean) => { down = v } }
}
