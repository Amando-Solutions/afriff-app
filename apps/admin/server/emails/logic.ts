// Festival emails (console → Festival emails), the staff app's server side.
// Called by server/api/emails/*. An admin writes an email in the console; this
// sends it to everyone who said yes to festival emails in the app
// (attendees/{uid}.marketing), through Brevo.
//
// HOW SENDING GOES:
//   - In batches of 50 (one request to Brevo each), in uid order. After each
//     batch, emails/{id} records the last uid done (`cursor`), so nobody gets
//     it twice and sending can stop and carry on at any point.
//   - Each call to the server sends for about 8 seconds, then the console calls
//     again ("more"), so no single request runs long.
//   - One sender at a time: a call holds the email for 90 seconds (renewed
//     after each batch); a second window or admin is told to wait.
//   - Brevo refusing (its free plan's daily limit, a wrong key, Brevo down)
//     pauses it, with the reason; "Continue sending" carries on from there.
//     An address Brevo won't take is skipped and listed, the rest go on.
//   - People who join or leave while it goes out: those leaving never get it;
//     those joining may or may not (depends on where their uid falls).
import { cleanDraft, draftProblems, renderEmail, type EmailDraft } from '../../shared/festivalEmail'
import { AccountError } from '../accounts/types'
import { TEST_UID, type LinkSigner } from './links'
import { MailerError, type Campaign, type CampaignStatus, type CampaignStore, type Mailer, type OutgoingEmail, type Subscriber } from './types'

export interface FestivalEmailDeps {
  store: CampaignStore
  mailer: Mailer
  signer: LinkSigner
  /** the attendee app's address, for "Open the AFRIFF app" */
  appUrl: string
  now?: () => number
}

export const BATCH = 50
const HOLD_MS = 90_000
const TIME_BUDGET_MS = 8_000
const FAILURES_KEPT = 20
/** this many addresses refused in a row is not about the addresses: stop */
const REFUSED_IN_A_ROW = 3
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface SendProgress {
  id: string
  status: CampaignStatus
  total: number
  sent: number
  failed: number
  /** call continue() again: there's more to send */
  more: boolean
  error: string
}

export type FestivalEmails = ReturnType<typeof createFestivalEmails>

/** Brevo turned down this one address (not the request as a whole). */
const addressRefused = (e: MailerError) => e.status === 400 && (e.code === 'invalid_parameter' || /email/i.test(e.message))

/** Why sending stopped, and what to do, in plain words. */
function pauseReason(e: MailerError): string {
  if (e.status === 401 || e.code === 'unauthorized') return `${e.message}. Brevo didn't accept the API key: check NUXT_BREVO_API_KEY on the staff app.`
  if (e.status === 0) return `${e.message} Press Continue sending to try again.`
  if (e.status === 429) return `${e.message}. Brevo asked us to slow down: wait a minute, then press Continue sending.`
  if (e.status === 402 || /credit|limit|quota/i.test(e.message)) {
    return `${e.message}. Brevo's free plan sends about 300 emails a day: press Continue sending tomorrow, or move Brevo to a paid plan.`
  }
  if (/sender/i.test(e.message)) return `${e.message}. Check the sender address (NUXT_EMAIL_FROM_ADDRESS) is set up in Brevo → Senders.`
  return `${e.message}. Press Continue sending to try again.`
}

export function createFestivalEmails({ store, mailer, signer, appUrl, now = Date.now }: FestivalEmailDeps) {
  function ready() {
    if (!mailer.ready) throw new AccountError(503, `Sending isn't set up on the server yet. Missing: ${mailer.missing.join('; ')}.`)
  }

  function checked(raw: unknown): EmailDraft {
    const d = cleanDraft(raw)
    const problem = Object.values(draftProblems(d))[0]
    if (problem) throw new AccountError(400, problem)
    return d
  }

  const emailFor = (d: EmailDraft, s: Subscriber, linkBase: string): OutgoingEmail => ({
    to: { email: s.email, name: s.firstName },
    subject: d.subject,
    html: renderEmail(d, { firstName: s.firstName, unsubscribeUrl: signer.url(linkBase, s.uid), appUrl }),
  })

  /** One batch: everyone in one request, or one by one when Brevo turns an address down. */
  async function sendPage(c: Campaign, page: Subscriber[]) {
    const r = { last: '', sent: 0, failed: 0, failures: [] as Campaign['failures'], stop: null as MailerError | null }
    const refused = (s: Subscriber, reason: string) => {
      r.failed++
      r.failures.push({ email: s.email, reason })
    }
    const usable = page.filter((s) => EMAIL.test(s.email))
    try {
      await mailer.send(usable.map((s) => emailFor(c, s, c.linkBase)))
      for (const s of page) if (!EMAIL.test(s.email)) refused(s, 'Not an email address.')
      r.sent = usable.length
      r.last = page.at(-1)!.uid
      return r
    } catch (e) {
      if (!(e instanceof MailerError)) throw e
      // nothing in this batch went out: it's sent again next time
      if (!addressRefused(e)) return { ...r, stop: e }
    }
    let inARow = 0
    for (const s of page) {
      if (!EMAIL.test(s.email)) {
        refused(s, 'Not an email address.')
      } else {
        try {
          await mailer.send([emailFor(c, s, c.linkBase)])
          r.sent++
          inARow = 0
        } catch (e) {
          if (!(e instanceof MailerError)) throw e
          if (!addressRefused(e) || ++inARow >= REFUSED_IN_A_ROW) return { ...r, stop: e }
          refused(s, e.message)
        }
      }
      r.last = s.uid
    }
    return r
  }

  async function carryOn(id: string): Promise<SendProgress> {
    ready()
    const started = now()
    const c = await store.claim(id, started, started + HOLD_MS)
    if (c === null) throw new AccountError(404, 'That email isn\'t in the list any more.')
    if (c === 'busy') throw new AccountError(409, 'This email is already being sent, from another window or by another admin. Wait a minute, then refresh the page.')
    const out = (status: CampaignStatus, more: boolean, error = ''): SendProgress => ({ id, status, total: c.total, sent: c.sent, failed: c.failed, more, error })
    if (c.status === 'sent') return out('sent', false)

    for (;;) {
      if (now() - started > TIME_BUDGET_MS) {
        await store.finish(id, { lockUntil: 0 })
        return out('sending', true)
      }
      const page = await store.subscribersAfter(c.cursor, BATCH)
      const r = page.length ? await sendPage(c, page) : null
      if (r) {
        c.sent += r.sent
        c.failed += r.failed
        c.failures = [...c.failures, ...r.failures].slice(0, FAILURES_KEPT)
        if (r.last) c.cursor = r.last
        await store.progress(id, { cursor: c.cursor, sent: c.sent, failed: c.failed, failures: c.failures, lockUntil: now() + HOLD_MS })
        if (r.stop) {
          const error = pauseReason(r.stop)
          await store.finish(id, { status: 'paused', error, lockUntil: 0 })
          return out('paused', false, error)
        }
      }
      if (page.length < BATCH) {
        await store.finish(id, { status: 'sent', error: '', finishedAt: now(), lockUntil: 0 })
        return out('sent', false)
      }
    }
  }

  return {
    /** For the console: can it send, and from which address? */
    setup() {
      return { ready: mailer.ready, missing: mailer.missing, from: mailer.from }
    },

    /** "Send me a test": only to the admin pressing it, subject marked [Test]. */
    async test(raw: unknown, to: { email: string; firstName: string }, linkBase: string) {
      ready()
      const d = checked(raw)
      if (!EMAIL.test(to.email)) throw new AccountError(400, 'Your login has no email address to send the test to.')
      const email = emailFor({ ...d, subject: `[Test] ${d.subject}` }, { uid: TEST_UID, email: to.email, firstName: to.firstName }, linkBase)
      try {
        await mailer.send([email])
      } catch (e) {
        if (e instanceof MailerError) throw new AccountError(502, pauseReason(e).replace('Press Continue sending to try again.', 'Try again in a minute.'))
        throw e
      }
      return { to: to.email }
    },

    /** "Send to N people": records the email, then starts sending (the console carries on while `more`). */
    async start(raw: unknown, by: { uid: string; name: string }, linkBase: string): Promise<SendProgress> {
      ready()
      const d = checked(raw)
      const total = await store.countSubscribers()
      if (!total) throw new AccountError(400, 'Nobody has said yes to festival emails yet, so there\'s no one to send to.')
      const id = await store.create({
        ...d, status: 'sending', total, sent: 0, failed: 0, failures: [], cursor: '', linkBase, lockUntil: 0, error: '',
        createdBy: by.uid, createdByName: by.name, createdAt: now(), finishedAt: 0,
      })
      return carryOn(id)
    },

    /** "Continue sending" (and the console's next call while `more`). */
    continue: carryOn,

    /** Is this a real unsubscribe link (the uid and its token match)? */
    isLink(uid: unknown, token: unknown): boolean {
      return signer.check(uid, token)
    },

    /** The link in an email: switches that person's festival emails off. */
    async unsubscribe(uid: unknown, token: unknown): Promise<boolean> {
      if (!signer.check(uid, token)) return false
      await store.unsubscribe(uid as string)
      return true
    },
  }
}
