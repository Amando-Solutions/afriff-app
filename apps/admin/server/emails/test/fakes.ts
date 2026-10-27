// A pretend database and a pretend Brevo for the festival email tests: same
// behaviour as firestoreStore.ts / brevo.ts, kept in memory.
import { MailerError, type Campaign, type CampaignStore, type Mailer, type OutgoingEmail } from '../types'

export interface FakeAttendee { email: string; firstName: string; marketing: boolean }

export function memoryCampaigns() {
  const attendees = new Map<string, FakeAttendee>()
  const emails = new Map<string, Campaign>()
  let next = 0
  const copy = <T>(v: T): T => structuredClone(v)
  const subscribers = () => [...attendees].filter(([, a]) => a.marketing).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  const store: CampaignStore = {
    async countSubscribers() { return subscribers().length },
    async subscribersAfter(cursor, limit) {
      return subscribers().filter(([uid]) => uid > cursor).slice(0, limit).map(([uid, a]) => ({ uid, email: a.email, firstName: a.firstName }))
    },
    async create(c) { const id = `e${++next}`; emails.set(id, copy(c)); return id },
    async get(id) { const c = emails.get(id); return c ? copy(c) : null },
    async claim(id, now, until) {
      const c = emails.get(id)
      if (!c) return null
      if (c.status === 'sent') return copy(c)
      if (c.lockUntil > now) return 'busy'
      Object.assign(c, { status: 'sending', error: '', lockUntil: until })
      return copy(c)
    },
    async progress(id, p) { Object.assign(emails.get(id)!, copy(p)) },
    async finish(id, patch) { Object.assign(emails.get(id)!, copy(patch)) },
    async unsubscribe(uid) { const a = attendees.get(uid); if (a) a.marketing = false },
  }
  return { store, attendees, emails }
}

/** A pretend Brevo: keeps what it was sent; can refuse addresses, or everything. */
export function fakeMailer(opts: { ready?: boolean } = {}) {
  const delivered: OutgoingEmail[] = []
  let calls = 0
  const refuse = new Set<string>()
  /** after this many more emails, it answers like Brevo's daily limit */
  let allowance = Infinity
  let down: MailerError | null = null

  const mailer: Mailer = {
    ready: opts.ready ?? true,
    missing: opts.ready === false ? ['NUXT_BREVO_API_KEY'] : [],
    from: 'AFRIFF <news@afriff.com>',
    async send(emails) {
      calls++
      if (down) throw down
      const bad = emails.find((e) => refuse.has(e.to.email))
      if (bad) throw new MailerError(400, `Brevo answered 400: email is not valid in to (${bad.to.email})`, 'invalid_parameter')
      if (emails.length > allowance) throw new MailerError(402, 'Brevo answered 402: You do not have enough credits to send emails', 'not_enough_credits')
      allowance -= emails.length
      delivered.push(...emails)
    },
  }
  return {
    mailer,
    delivered,
    calls: () => calls,
    refuse: (email: string) => refuse.add(email),
    setAllowance: (n: number) => { allowance = n },
    setDown: (e: MailerError | null) => { down = e },
  }
}
