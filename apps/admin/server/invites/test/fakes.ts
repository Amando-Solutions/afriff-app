// A pretend database and a pretend Brevo for the invitation tests: same
// behaviour as firestoreStore.ts / brevo.ts, kept in memory.
import { contactFrom, contactKey, mergePeople, type AttendeeFacts, type ContactRecord } from '../../../shared/contacts'
import { MailerError } from '../../emails/types'
import type { Batch, DeliveryProblem, InviteMailer, InviteRecord, InviteStore, RecipientRecord } from '../types'

export function memoryInvites() {
  const invites = new Map<string, InviteRecord>()
  const recipients = new Map<string, Map<string, RecipientRecord>>()
  const contacts = new Map<string, ContactRecord>()
  const attendees = new Map<string, AttendeeFacts>()
  const groups = new Map<string, string>()
  const copy = <T>(v: T): T => structuredClone(v)
  const guestsOf = (id: string) => {
    if (!recipients.has(id)) recipients.set(id, new Map())
    return recipients.get(id)!
  }

  const store: InviteStore = {
    async get(id) { const c = invites.get(id); return c ? copy(c) : null },
    async begin(id, from, now, until, patch) {
      const c = invites.get(id)
      if (!c) return null
      if (!from.includes(c.status)) return 'wrong-status'
      if (c.lockUntil > now) return 'busy'
      Object.assign(c, copy(patch), { lockUntil: until })
      return copy(c)
    },
    async update(id, patch) { Object.assign(invites.get(id)!, copy(patch)) },
    async groupNames() { return Object.fromEntries(groups) },
    async people(gs, keys) {
      const found = new Map<string, ContactRecord>()
      for (const c of contacts.values()) if (c.groups.some((g) => gs.includes(g))) found.set(c.key, c)
      for (const k of keys) { const c = contacts.get(k); if (c) found.set(k, c) }
      const emails = new Set([...found.keys(), ...keys])
      return mergePeople([...attendees.values()].filter((a) => emails.has(contactKey(a.email))), [...found.values()].map(copy))
    },
    async recipients(id) { return [...guestsOf(id).values()].map(copy) },
    async addRecipients(id, list) { for (const r of list) guestsOf(id).set(r.key, copy(r)) },
    async queued(id, limit) {
      return [...guestsOf(id).values()].filter((r) => r.status === 'queued').sort((a, b) => (a.key < b.key ? -1 : 1)).slice(0, limit).map(copy)
    },
    async setRecipients(id, changes) { for (const c of changes) Object.assign(guestsOf(id).get(c.key)!, copy(c.patch)) },
    async deleteRecipients(id) { recipients.delete(id) },
    async moveContact(fromKey, toEmail) {
      const toKey = contactKey(toEmail)
      const from = contacts.get(fromKey)
      if (!from || toKey === fromKey) return false
      contacts.delete(fromKey)
      const to = contacts.get(toKey)
      if (to) to.groups = [...new Set([...to.groups, ...from.groups])]
      else contacts.set(toKey, { ...from, key: toKey, email: toEmail })
      return true
    },
    async unsubscribe(inviteId, key, now) {
      const g = guestsOf(inviteId).get(key)
      const emailKey = contactKey(g?.email || key)
      for (const a of attendees.values()) if (contactKey(a.email) === emailKey) a.marketing = false
      const c = contacts.get(emailKey)
      if (c && !c.unsubscribedAt) Object.assign(c, { agreed: false, unsubscribedAt: now })
      if (!g || g.unsubscribedAt) return false
      g.unsubscribedAt = now
      invites.get(inviteId)!.unsubscribed++
      return true
    },
  }

  return {
    store, invites, recipients, contacts, attendees, groups,
    /** an app sign-up */
    signUp(uid: string, email: string, firstName: string, lastName: string, marketing: boolean) {
      attendees.set(uid, { uid, email, firstName, lastName, marketing, createdAt: 1 })
    },
    /** AFRIFF's record of someone (groups, VIP; hand-added guests' details) */
    contact(email: string, d: Record<string, unknown>) {
      const key = contactKey(email)
      contacts.set(key, contactFrom(key, { email: d.source === 'afriff' ? email : '', ...d }))
    },
    guests: (id: string) => [...guestsOf(id).values()],
  }
}

/** A pretend Brevo: keeps what it was sent; can refuse addresses, or everything. */
export function fakeInviteMailer(opts: { ready?: boolean } = {}) {
  const batches: Batch[] = []
  const cancelled: string[] = []
  const refuse = new Set<string>()
  let allowance = Infinity
  let down: MailerError | null = null
  const problems: (DeliveryProblem & { tag: string })[] = []

  const mailer: InviteMailer = {
    ready: opts.ready ?? true,
    missing: opts.ready === false ? ['NUXT_INVITE_FROM_ADDRESS'] : [],
    from: 'AFRIFF <invites@afriff.app>',
    async send(b) {
      if (down) throw down
      const bad = b.emails.find((e) => refuse.has(e.to.email))
      if (bad) throw new MailerError(400, `Brevo answered 400: email is not valid in to (${bad.to.email})`, 'invalid_parameter')
      if (b.emails.length > allowance) throw new MailerError(402, 'Brevo answered 402: You do not have enough credits to send emails', 'not_enough_credits')
      allowance -= b.emails.length
      batches.push(structuredClone(b))
    },
    async cancel(batchId) { cancelled.push(batchId) },
    async stats(tag) {
      const sent = batches.filter((b) => b.tag === tag).flatMap((b) => b.emails).length
      const bad = problems.filter((p) => p.tag === tag)
      return { requests: sent, delivered: sent - bad.length, uniqueOpens: 1, hardBounces: bad.filter((p) => p.kind === 'hardBounces').length, softBounces: 0, blocked: 0, invalid: 0 }
    },
    async problems(tag) { return problems.filter((p) => p.tag === tag).map(({ tag: _t, ...p }) => p) },
  }
  return {
    mailer, batches, cancelled,
    /** every email sent, in order */
    emails: () => batches.flatMap((b) => b.emails),
    refuse: (email: string) => refuse.add(email),
    setAllowance: (n: number) => { allowance = n },
    setDown: (e: MailerError | null) => { down = e },
    bounce: (tag: string, email: string) => problems.push({ tag, email, kind: 'hardBounces', reason: 'Mailbox does not exist', date: '2026-10-28T10:00:00Z' }),
  }
}
