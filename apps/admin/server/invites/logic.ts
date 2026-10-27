// Invitations (console → Invitations), the staff app's server side. Called by
// server/api/invites/*. Editors and admins write an invite in the console
// (saved straight to invites/{id} as a draft); ONLY AN ADMIN can send it, and
// that is checked here on the server (the routes that send are admin-only).
//
// WHO GETS IT: worked out again at the moment of sending (shared/contacts.ts):
// whole groups + people picked − people left out, each person once, only those
// who can be emailed. The guests are written to invites/{id}/recipients/{key}
// (the guest list), each "queued", then sent in batches and marked "sent".
// Because each guest is a record, "Send to new people only" just adds the ones
// not there yet, and a fixed bounced address is queued again.
//
// HOW SENDING GOES (as festival emails, server/emails/logic.ts):
//   - batches of 50, one request to Brevo each; each call to the server works
//     for about 8 seconds, then the console calls again while `more`;
//   - one sender at a time (a 90-second hold, renewed after each batch);
//   - Brevo refusing pauses it with the reason; "Continue sending" carries on
//     with whoever is still queued, so nobody gets it twice;
//   - an address Brevo won't take is skipped and listed, the rest go on.
// SCHEDULED: the same batches, each told to wait at Brevo until the time
// (Brevo holds them up to 72 hours). Calling it off asks Brevo to drop them.
import { emailProblem } from '@afriff/core/accounts/rules'
import { audienceKeys, contactKey, resolveAudience, type Person, type Resolved, type SkipReason } from '../../shared/contacts'
import {
  calendarFile, googleCalendarLink, inviteProblems, renderInvite, subjectOf, type InviteContent,
} from '../../shared/invites'
import { AccountError } from '../accounts/types'
import { MailerError } from '../emails/types'
import { TEST_GUEST, type InviteLinkSigner } from './links'
import type { Batch, DeliveryProblem, InviteMailer, InviteRecord, InviteStatus, InviteStore, OneEmail, RecipientRecord } from './types'

export interface InviteDeps {
  store: InviteStore
  mailer: InviteMailer
  links: InviteLinkSigner
  /** the attendee app's address (APP_LINK) */
  appUrl: string
  now?: () => number
  /** Brevo's handle for a scheduled send: a UUID */
  newBatchId?: () => string
}

export const BATCH = 50
const HOLD_MS = 90_000
const TIME_BUDGET_MS = 8_000
const FAILURES_KEPT = 20
const REFUSED_IN_A_ROW = 3
/** a scheduled send: at least this far ahead… */
export const SCHEDULE_MIN_MS = 10 * 60_000
/** …and at most this far (Brevo holds emails for up to 72 hours) */
export const SCHEDULE_MAX_MS = 71 * 3_600_000
export const MAX_TEST = 5

/** every email of one invite carries it; Brevo's statistics are found by it */
export const tagFor = (id: string) => `afriff-invite-${id}`
const TEST_TAG = 'afriff-invite-test'

export type SendMode = 'all' | 'new' | 'resend'

export interface SendProgress {
  id: string
  status: InviteStatus
  total: number
  sent: number
  failed: number
  scheduledAt: number
  /** call continue() again: there's more to send */
  more: boolean
  error: string
}

export type Invitations = ReturnType<typeof createInvites>

const addressRefused = (e: MailerError) => e.status === 400 && (e.code === 'invalid_parameter' || /email/i.test(e.message))

/** Why Brevo stopped, and what to do, in plain words. */
function brevoReason(e: MailerError, next = 'Press Continue sending to try again.'): string {
  if (e.status === 401 || e.code === 'unauthorized') return `${e.message}. Brevo didn't accept the API key: check NUXT_BREVO_API_KEY on the staff app.`
  if (e.status === 0) return `${e.message} ${next}`
  if (e.status === 429) return `${e.message}. Brevo asked us to slow down: wait a minute. ${next}`
  if (e.status === 402 || /credit|limit|quota/i.test(e.message)) {
    return `${e.message}. Brevo's free plan sends about 300 emails a day: ${next.replace('to try again', 'tomorrow')} Or move Brevo to a paid plan.`
  }
  if (/sender/i.test(e.message)) return `${e.message}. Check the sender address (NUXT_INVITE_FROM_ADDRESS) is set up in Brevo → Senders, Domains.`
  return `${e.message}. ${next}`
}

/** A scheduled invite whose time has come is, as far as anyone can tell, sent. */
export const effectiveStatus = (c: Pick<InviteRecord, 'status' | 'scheduledAt'>, now: number): InviteStatus =>
  c.status === 'scheduled' && c.scheduledAt <= now ? 'sent' : c.status


export function createInvites({ store, mailer, links, appUrl, now = Date.now, newBatchId = () => crypto.randomUUID() }: InviteDeps) {
  function ready() {
    if (!mailer.ready) throw new AccountError(503, `Sending isn't set up on the server yet. Missing: ${mailer.missing.join('; ')}.`)
  }

  async function load(id: unknown): Promise<InviteRecord> {
    if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) throw new AccountError(400, 'Which invite? (no id)')
    const c = await store.get(id)
    if (!c) throw new AccountError(404, 'That invite isn\'t in the list any more.')
    return c
  }

  const viaBrevo = async <T>(work: Promise<T>, next?: string): Promise<T> => {
    try {
      return await work
    } catch (e) {
      if (e instanceof MailerError) throw new AccountError(502, brevoReason(e, next ?? 'Try again in a minute.'))
      throw e
    }
  }

  /** The invite is complete (the same checks as the console's form). */
  function checkContent(c: InviteContent) {
    const first = Object.values(inviteProblems(c))[0]
    if (first) throw new AccountError(400, `Finish the invite first: ${first}`)
  }

  /** Who it goes to right now, and the groups' names. */
  async function guestsOf(c: InviteRecord): Promise<{ resolved: Resolved; names: Record<string, string> }> {
    const names = await store.groupNames()
    if (c.parentId) {
      // an update: the people the invite went to, minus anyone who unsubscribed since
      const keys = (await store.recipients(c.parentId)).filter((r) => r.status === 'sent').map((r) => r.key)
      const people = await store.people([], [...keys, ...c.audience.exclude])
      return { resolved: resolveAudience(people, { groups: [], people: keys, exclude: c.audience.exclude }), names }
    }
    const people = await store.people(c.audience.groups, audienceKeys(c.audience))
    return { resolved: resolveAudience(people, c.audience), names }
  }

  function recipientFor(p: Person, c: InviteRecord, names: Record<string, string>, run: number): RecipientRecord {
    const chosen = p.groups.filter((g) => c.audience.groups.includes(g))
    return {
      key: p.key, uid: p.uid, email: p.email, firstName: p.firstName, lastName: p.lastName,
      groups: (chosen.length ? chosen : p.groups).map((g) => names[g]).filter((n): n is string => Boolean(n)),
      vip: p.vip, addedByAfriff: p.source === 'afriff',
      status: 'queued', reason: '', run, sentAt: 0, fixedFrom: '', unsubscribedAt: 0,
    }
  }

  const calendarUrl = (base: string, id: string) => `${base}/api/invites/calendar?i=${encodeURIComponent(id)}`

  /** One guest's email: the invitation made for them (shared/invites.ts), with their own unsubscribe link. */
  function emailFor(c: InviteRecord, guest: Pick<RecipientRecord, 'key' | 'email' | 'firstName' | 'lastName'>, opts: { subject?: string; unsubscribeKey?: string } = {}): OneEmail {
    const html = renderInvite(c, guest, { calendar: calendarUrl(c.linkBase, c.id), app: appUrl, unsubscribe: links.url(c.linkBase, c.id, opts.unsubscribeKey ?? guest.key) })
    return { to: { email: guest.email, name: `${guest.firstName} ${guest.lastName}`.trim() }, subject: opts.subject ?? subjectOf(c), html }
  }

  function batchOf(c: InviteRecord, emails: OneEmail[]): Batch {
    const later = c.scheduledAt > now() + 60_000
    return {
      tag: tagFor(c.id),
      emails,
      ...(later ? { scheduledAt: new Date(c.scheduledAt).toISOString(), batchId: c.batchId } : {}),
    }
  }

  /** One batch: everyone in one request, or one by one when Brevo turns an address down. */
  async function sendPage(c: InviteRecord, page: RecipientRecord[]) {
    const r = { sent: [] as string[], failed: [] as { key: string; email: string; reason: string }[], stop: null as MailerError | null }
    const usable = page.filter((g) => !emailProblem(g.email))
    for (const g of page) if (emailProblem(g.email)) r.failed.push({ key: g.key, email: g.email, reason: 'Not an email address.' })
    try {
      await mailer.send(batchOf(c, usable.map((g) => emailFor(c, g))))
      r.sent = usable.map((g) => g.key)
      return r
    } catch (e) {
      if (!(e instanceof MailerError)) throw e
      // nothing in this batch went out: they stay queued
      if (!addressRefused(e)) return { ...r, failed: [], stop: e }
    }
    let inARow = 0
    for (const g of usable) {
      try {
        await mailer.send(batchOf(c, [emailFor(c, g)]))
        r.sent.push(g.key)
        inARow = 0
      } catch (e) {
        if (!(e instanceof MailerError)) throw e
        if (!addressRefused(e) || ++inARow >= REFUSED_IN_A_ROW) return { ...r, stop: e }
        r.failed.push({ key: g.key, email: g.email, reason: e.message })
      }
    }
    return r
  }

  const progress = (c: InviteRecord, status: InviteStatus, more: boolean, error = ''): SendProgress =>
    ({ id: c.id, status, total: c.total, sent: c.sent, failed: c.failed, scheduledAt: c.scheduledAt, more, error })

  /** Sends to whoever is still queued, for a few seconds. `held`: begin() already took it. */
  async function carryOn(id: string, held = false): Promise<SendProgress> {
    ready()
    const started = now()
    let c: InviteRecord
    if (held) {
      c = await load(id)
    } else {
      const taken = await store.begin(id, ['sending', 'paused'], started, started + HOLD_MS, { status: 'sending', error: '' })
      if (taken === null) throw new AccountError(404, 'That invite isn\'t in the list any more.')
      if (taken === 'busy') throw new AccountError(409, 'This invite is being sent right now, from another window or by another admin. Wait a minute, then refresh the page.')
      if (taken === 'wrong-status') {
        const now$ = await load(id)
        return progress(now$, effectiveStatus(now$, now()), false)
      }
      c = taken
    }

    for (;;) {
      if (now() - started > TIME_BUDGET_MS) {
        await store.update(id, { lockUntil: 0 })
        return progress(c, 'sending', true)
      }
      const page = await store.queued(id, BATCH)
      if (page.length) {
        const r = await sendPage(c, page)
        const at = c.scheduledAt > now() ? c.scheduledAt : now()
        await store.setRecipients(id, [
          ...r.sent.map((key) => ({ key, patch: { status: 'sent' as const, sentAt: at, run: c.runs, reason: '' } })),
          ...r.failed.map((f) => ({ key: f.key, patch: { status: 'failed' as const, reason: f.reason } })),
        ])
        c.sent += r.sent.length
        c.failed += r.failed.length
        c.failures = [...c.failures, ...r.failed.map((f) => ({ email: f.email, reason: f.reason }))].slice(-FAILURES_KEPT)
        await store.update(id, { sent: c.sent, failed: c.failed, failures: c.failures, lockUntil: now() + HOLD_MS })
        if (r.stop) {
          const error = brevoReason(r.stop)
          await store.update(id, { status: 'paused', error, lockUntil: 0 })
          return progress(c, 'paused', false, error)
        }
      }
      if (page.length < BATCH) {
        const status: InviteStatus = c.scheduledAt > now() ? 'scheduled' : 'sent'
        await store.update(id, { status, error: '', finishedAt: now(), lockUntil: 0 })
        return progress(c, status, false)
      }
    }
  }

  function taken(r: InviteRecord | 'busy' | 'wrong-status' | null): InviteRecord {
    if (r === null) throw new AccountError(404, 'That invite isn\'t in the list any more.')
    if (r === 'busy') throw new AccountError(409, 'Another admin (or another window) is sending this invite right now. Wait a minute, then refresh the page.')
    if (r === 'wrong-status') throw new AccountError(409, 'This invite changed in the meantime (someone else sent or scheduled it). Refresh the page.')
    return r
  }

  const skippedSummary = (r: Resolved) => {
    const counts: Partial<Record<SkipReason, number>> = {}
    for (const s of r.skipped) counts[s.reason] = (counts[s.reason] ?? 0) + 1
    return counts
  }

  return {
    /** For the console: can it send, and from which address? */
    setup() {
      return { ready: mailer.ready, missing: mailer.missing, from: mailer.from }
    },

    /** Who it would go to now: for "Send to 87 people?", and "Send to new people only". */
    async count(id: unknown) {
      const c = await load(id)
      const { resolved } = await guestsOf(c)
      const already = new Set(c.status === 'draft' || c.status === 'review' ? [] : (await store.recipients(c.id)).map((r) => r.key))
      return {
        status: effectiveStatus(c, now()),
        send: resolved.send.length,
        newPeople: resolved.send.filter((p) => !already.has(p.key)).length,
        skipped: skippedSummary(resolved),
        skippedPeople: resolved.skipped.slice(0, 100).map((s) => ({ name: `${s.person.firstName} ${s.person.lastName}`.trim(), email: s.person.email, reason: s.reason })),
        excluded: resolved.excluded,
        duplicates: resolved.duplicates,
      }
    },

    /** "Send a test" (editors too): to up to 5 addresses, subject marked [Test]; the unsubscribe link changes nothing. */
    async test(id: unknown, rawTo: unknown, linkBase: string) {
      ready()
      const c = await load(id)
      const list = (Array.isArray(rawTo) ? rawTo : String(rawTo ?? '').split(/[\s,;]+/)).map((e) => String(e).trim()).filter(Boolean)
      const to = [...new Map(list.map((e) => [contactKey(e), e])).values()]
      if (!to.length) throw new AccountError(400, 'Type at least one email address to send the test to.')
      if (to.length > MAX_TEST) throw new AccountError(400, `A test goes to ${MAX_TEST} addresses at most.`)
      for (const e of to) {
        const problem = emailProblem(e)
        if (problem) throw new AccountError(400, `${e}: ${problem}`)
      }
      checkContent(c)
      const known = new Map((await store.people([], to.map(contactKey))).map((p) => [p.key, p]))
      const test = { ...c, linkBase }
      const emails = to.map((email) => {
        const p = known.get(contactKey(email))
        return emailFor(test, { key: TEST_GUEST, email, firstName: p?.firstName || 'Guest', lastName: p?.lastName || '' }, { subject: `[Test] ${subjectOf(c)}`, unsubscribeKey: TEST_GUEST })
      })
      await viaBrevo(mailer.send({ tag: TEST_TAG, emails }))
      return { to }
    },

    /**
     * ADMINS ONLY (the route checks). mode:
     *   all     the first send (from a draft, or waiting for approval), now or at `scheduledAt`
     *   new     only people who can get it now and haven't yet (late additions)
     *   resend  whoever is queued again (bounced addresses an admin fixed)
     */
    async start(id: unknown, mode: unknown, opts: { scheduledAt?: unknown }, by: { name: string }, linkBase: string): Promise<SendProgress> {
      ready()
      const c = await load(id)
      const t = now()
      const status = effectiveStatus(c, t)

      if (mode === 'all') {
        if (status !== 'draft' && status !== 'review') throw new AccountError(409, 'This invite has already gone out. For people added since, use "Send to new people only".')
        const at = opts.scheduledAt == null || opts.scheduledAt === 0 ? 0 : Number(opts.scheduledAt)
        if (at) {
          if (!Number.isFinite(at) || at < t + SCHEDULE_MIN_MS) throw new AccountError(400, 'Schedule it at least 10 minutes from now, or send it now.')
          if (at > t + SCHEDULE_MAX_MS) throw new AccountError(400, 'Brevo can hold an email for up to 3 days. Pick a time within the next 71 hours, or schedule it later.')
        }
        checkContent(c)
        const { resolved, names } = await guestsOf(c)
        if (!resolved.send.length) throw new AccountError(400, 'Nobody on this invite can be emailed. Check the groups and people chosen, and that they agreed to emails.')
        const run = 1
        taken(await store.begin(c.id, ['draft', 'review'], t, t + HOLD_MS, {
          status: 'sending', scheduledAt: at, batchId: at ? newBatchId() : '', total: resolved.send.length, sent: 0, failed: 0, failures: [],
          runs: run, error: '', linkBase, groupNames: c.audience.groups.map((g) => names[g]).filter((n): n is string => Boolean(n)),
          unsubscribed: 0, sentByName: by.name, sentAt: t, finishedAt: 0,
        }))
        await store.addRecipients(c.id, resolved.send.map((p) => recipientFor(p, c, names, run)))
        return carryOn(c.id, true)
      }

      if (mode === 'new') {
        if (status !== 'sent' && status !== 'scheduled') throw new AccountError(409, status === 'draft' || status === 'review' ? 'Send the invite first.' : 'Wait until this send has finished.')
        checkContent(c)
        const { resolved, names } = await guestsOf(c)
        const already = new Set((await store.recipients(c.id)).map((r) => r.key))
        const fresh = resolved.send.filter((p) => !already.has(p.key))
        if (!fresh.length) throw new AccountError(400, 'Nobody new: everyone who can get this invite already has it.')
        const run = c.runs + 1
        taken(await store.begin(c.id, ['sent', 'scheduled'], t, t + HOLD_MS, { status: 'sending', runs: run, total: c.total + fresh.length, error: '' }))
        await store.addRecipients(c.id, fresh.map((p) => recipientFor(p, c, names, run)))
        return carryOn(c.id, true)
      }

      if (mode === 'resend') {
        if (status !== 'sent') throw new AccountError(409, 'Wait until this invite has gone out.')
        checkContent(c)
        const queued = await store.queued(c.id, 1)
        if (!queued.length) throw new AccountError(400, 'No fixed addresses are waiting. Fix a bounced address first.')
        taken(await store.begin(c.id, ['sent', 'scheduled'], t, t + HOLD_MS, { status: 'sending', runs: c.runs + 1, error: '' }))
        return carryOn(c.id, true)
      }
      throw new AccountError(400, 'Send how? (all, new or resend)')
    },

    /** "Continue sending" (and the console's next call while `more`). Admins only. */
    continue: (id: unknown) => load(id).then((c) => carryOn(c.id)),

    /** Calls off a scheduled invite (admins): Brevo drops it, and it's back to "waiting for approval". */
    async cancel(id: unknown) {
      ready()
      const c = await load(id)
      const t = now()
      if (!c.scheduledAt || (c.status !== 'scheduled' && c.status !== 'paused' && c.status !== 'sending')) throw new AccountError(409, 'This invite isn\'t scheduled.')
      if (c.scheduledAt <= t + 60_000) throw new AccountError(409, 'Too late to call it off: Brevo is sending it now.')
      taken(await store.begin(c.id, ['scheduled', 'paused', 'sending'], t, t + HOLD_MS, {}))
      try {
        if (c.batchId && c.sent > 0) await mailer.cancel(c.batchId)
      } catch (e) {
        await store.update(c.id, { lockUntil: 0 })
        if (e instanceof MailerError && e.status === 404) throw new AccountError(409, 'Brevo has no scheduled send for this invite any more (it may have gone already). Refresh the page.')
        if (e instanceof MailerError) throw new AccountError(502, brevoReason(e, 'Try again in a minute.'))
        throw e
      }
      await store.deleteRecipients(c.id)
      await store.update(c.id, {
        status: 'review', scheduledAt: 0, batchId: '', total: 0, sent: 0, failed: 0, failures: [], runs: 0, error: '',
        sentByName: '', sentAt: 0, finishedAt: 0, lockUntil: 0,
      })
      return { status: 'review' as const }
    },

    /**
     * A bounced address fixed by an admin: this guest is queued again with it
     * ("Resend to fixed addresses" sends them). A guest added by hand also gets
     * the new address on their contact, for later invites.
     */
    async fix(id: unknown, key: unknown, email: unknown) {
      const c = await load(id)
      const address = typeof email === 'string' ? email.trim() : ''
      const problem = emailProblem(address)
      if (problem) throw new AccountError(400, problem)
      if (effectiveStatus(c, now()) !== 'sent') throw new AccountError(409, 'Wait until this invite has gone out.')
      const r = (await store.recipients(c.id)).find((g) => g.key === key)
      if (!r) throw new AccountError(404, 'That guest isn\'t on this invite.')
      if (contactKey(address) === contactKey(r.email)) throw new AccountError(400, 'That\'s the address it already went to.')
      await store.setRecipients(c.id, [{ key: r.key, patch: { email: address, status: 'queued', reason: '', fixedFrom: r.fixedFrom || r.email } }])
      const contactUpdated = r.addedByAfriff && !r.uid ? await store.moveContact(contactKey(r.email), address) : false
      return { contactUpdated }
    },

    /** The log: Brevo's counts for this invite, ours for unsubscribes, and the addresses that didn't take it. */
    async stats(id: unknown) {
      const c = await load(id)
      if (c.status === 'draft' || c.status === 'review') return { stats: null, problems: [], queued: 0, unsubscribed: 0 }
      const tag = tagFor(c.id)
      const [s, found, recipients] = await Promise.all([viaBrevo(mailer.stats(tag)), viaBrevo(mailer.problems(tag)), store.recipients(c.id)])
      const byEmail = new Map(recipients.map((r) => [r.email.toLowerCase(), r]))
      const byOld = new Map(recipients.filter((r) => r.fixedFrom).map((r) => [r.fixedFrom.toLowerCase(), r]))
      // one line per address (its worst problem): a hard bounce beats a soft one
      const rank: Record<DeliveryProblem['kind'], number> = { hardBounces: 0, invalid: 1, blocked: 2, softBounces: 3 }
      const seen = new Map<string, DeliveryProblem>()
      for (const p of found) {
        const was = seen.get(p.email)
        if (!was || rank[p.kind] < rank[was.kind]) seen.set(p.email, p)
      }
      const problems = [...seen.values()].map((p) => {
        const fixed = byOld.get(p.email)
        const r = fixed ?? byEmail.get(p.email)
        return {
          ...p,
          key: r?.key ?? '',
          name: r ? `${r.firstName} ${r.lastName}`.trim() : '',
          // fixed: went (or will go) again to another address
          fixedTo: fixed && fixed.email.toLowerCase() !== p.email ? fixed.email : '',
          queued: r?.status === 'queued',
        }
      })
      return {
        stats: s,
        problems,
        queued: recipients.filter((r) => r.status === 'queued').length,
        unsubscribed: recipients.filter((r) => r.unsubscribedAt).length,
      }
    },

    /** The "Add to calendar" page's content (public: anyone with the link). */
    async calendar(id: unknown) {
      if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) return null
      const c = await store.get(id)
      if (!c) return null
      return { event: c.event, ics: calendarFile(c, { id: c.id, appUrl, now: new Date(now()) }), google: googleCalendarLink(c) }
    },

    /** Is this a real unsubscribe link? The guest's key, TEST_GUEST, or null. */
    checkLink(inviteId: unknown, guest: unknown, token: unknown): string | null {
      if (guest === TEST_GUEST) return TEST_GUEST
      return links.check(inviteId, guest, token)
    },

    /** The link's button: emails off for that guest. */
    async unsubscribe(inviteId: unknown, guest: unknown, token: unknown): Promise<boolean> {
      const key = links.check(inviteId, guest, token)
      if (!key) return false
      await store.unsubscribe(inviteId as string, key, now())
      return true
    },
  }
}
