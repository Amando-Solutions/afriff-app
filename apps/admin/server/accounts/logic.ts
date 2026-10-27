// Attendee accounts: sign up, log in, forgot PIN, emails on/off, delete.
// Called by the routes in server/api/account/* (attendee phones) and
// server/api/attendees/* (admins). Everything that decides something lives
// here, so it can be tested without Firebase or Brevo (accounts.test.ts).
//
// Security rules (agreed with AFRIFF's product owner, 26 Oct 2026):
//   - PINs are 4 digits; easy ones (1234, 0000, years…) are refused.
//   - PINs are stored scrambled with a server-only secret key (pin.ts).
//   - 5 wrong PINs in a row → 15-minute pause. 10 in a row → the account only
//     opens again with a new PIN, set with a 6-digit code sent by email.
//   - Each network (IP address, stored only scrambled) gets at most 50 wrong
//     PINs or codes per 15 minutes, across all accounts, so nobody can try
//     common PINs against many emails. Generous, because many phones share one
//     address on mobile data and venue Wi-Fi.
//   - Codes work for 15 minutes, 5 tries, at most 3 emails per hour per account.
import {
  CODE_MINUTES,
  CODE_TRIES,
  CODES_PER_HOUR,
  MARKETING_CONSENT,
  PAUSE_MINUTES,
  TRIES_BEFORE_PAUSE,
  TRIES_BEFORE_RESET,
  cleanName,
  emailProblem,
  maskEmail,
  nameProblem,
  normaliseEmail,
  pinProblem,
} from '@afriff/core/accounts/rules'
import { codeHash, emailKey, hashPin, newCode, newUid, sameCode, verifyPin } from './pin'
import {
  AccountError,
  type AccountStore,
  type Attendee,
  type BrevoStatus,
  type Mailer,
  type MarketingList,
  type PublicProfile,
  type Session,
} from './types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Per network: wrong PINs or codes per 15 minutes, sign-ups and code emails per hour. */
export const NETWORK_LIMITS = { fails: 50, failWindow: 15 * MINUTE, signups: 200, codes: 30 }

export interface AccountDeps {
  store: AccountStore
  /** the server-only secret key PINs and codes are mixed with (NUXT_ATTENDEE_PIN_SECRET) */
  pepper: string
  mail: Mailer
  list: MarketingList
  /** a Firebase custom token for this account (the phone signs in with it) */
  token(uid: string): Promise<string>
  /** remove the account's Firebase sign-in */
  dropLogin(uid: string): Promise<void>
  now?: () => number
  /** local testing only: with no email service, print codes in the server's terminal */
  printCodes?: boolean
}

export interface SignUpInput {
  firstName: unknown
  lastName: unknown
  email: unknown
  pin: unknown
  marketing: unknown
}

const text = (v: unknown) => (typeof v === 'string' ? v : '')
const lagosDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function check(problem: string | null, field: string) {
  if (problem) throw new AccountError(400, problem, { field })
}

type LogInOutcome = { kind: 'ok' } | { kind: 'reset' } | { kind: 'paused'; minutes: number } | { kind: 'wrong'; fails: number }
type ResetOutcome = { kind: 'ok' } | { kind: 'expired' } | { kind: 'wrong'; left: number }

export type Accounts = ReturnType<typeof createAccounts>

export function createAccounts(deps: AccountDeps) {
  const { store, pepper, mail, list } = deps
  const now = deps.now ?? Date.now

  const profileOf = (uid: string, a: Attendee): PublicProfile => ({
    uid, firstName: a.firstName, lastName: a.lastName, email: a.email, marketing: a.marketing,
  })

  async function session(uid: string, a: Attendee): Promise<Session> {
    return { token: await deps.token(uid), profile: profileOf(uid, a) }
  }

  async function findAccount(email: string) {
    const uid = await store.uidForEmail(emailKey(normaliseEmail(email)))
    const attendee = uid ? await store.attendee(uid) : null
    return uid && attendee ? { uid, attendee } : null
  }

  // ---------- network limits ----------
  async function networkBlocked(ip: string) {
    if (ip && (await store.count(`fail-${ip}`, NETWORK_LIMITS.failWindow, 0, now())) >= NETWORK_LIMITS.fails) {
      throw new AccountError(429, 'Too many wrong tries from this network. Wait 15 minutes, then try again.', { reason: 'network' })
    }
  }
  const networkFail = async (ip: string) => {
    if (ip) await store.count(`fail-${ip}`, NETWORK_LIMITS.failWindow, 1, now())
  }

  // ---------- Brevo "App subscribers" list ----------
  /** Puts the person on (or takes them off) the list. Never throws: problems are saved on their record. */
  async function syncList(uid: string, a: Attendee): Promise<BrevoStatus> {
    let status: BrevoStatus
    let error = ''
    if (!list.ready) {
      // waits for "Send to Brevo" once Brevo is set up (nothing to remove if they were never sent)
      status = a.marketing ? 'pending' : a.brevo === 'sent' || a.brevo === 'confirm-sent' ? 'failed' : 'off'
      if (status === 'failed') error = 'Brevo isn\'t set up on the server, so they couldn\'t be taken off the list.'
    } else {
      try {
        if (a.marketing) {
          status = await list.add({ email: a.email, firstName: a.firstName, lastName: a.lastName })
        } else {
          await list.remove(a.email)
          status = 'removed'
        }
      } catch (e) {
        status = 'failed'
        error = (e instanceof Error ? e.message : String(e)).slice(0, 300)
      }
    }
    await store.updateAttendee(uid, { brevo: status, brevoError: error })
    return status
  }

  return {
    // ---------- Sign up ----------
    async signUp(input: SignUpInput, ip: string): Promise<Session> {
      const firstName = cleanName(text(input.firstName))
      const lastName = cleanName(text(input.lastName))
      const email = text(input.email).trim()
      const pin = text(input.pin)
      check(nameProblem(firstName, 'first name'), 'firstName')
      check(nameProblem(lastName, 'last name'), 'lastName')
      check(emailProblem(email), 'email')
      check(pinProblem(pin), 'pin')
      const marketing = input.marketing === true

      if (ip && (await store.count(`signup-${ip}`, HOUR, 1, now())) > NETWORK_LIMITS.signups) {
        throw new AccountError(429, 'Too many sign-ups from this network in the last hour. Try again later.', { reason: 'network' })
      }

      const t = now()
      const emailLower = normaliseEmail(email)
      const attendee: Attendee = {
        firstName, lastName, email, emailLower, marketing,
        optInAtSignUp: marketing ? 1 : 0,
        consentText: marketing ? MARKETING_CONSENT : '',
        marketingChangedAt: t,
        createdAt: t,
        createdDay: lagosDay(t),
        lastLoginAt: 0,
        brevo: marketing ? 'pending' : 'off',
        brevoError: '',
      }
      const uid = newUid()
      const created = await store.create(uid, emailKey(emailLower), attendee, {
        pin: await hashPin(pin, pepper), fails: 0, lockedUntil: 0, needsReset: false, code: null, codesSent: [],
      })
      if (!created) throw new AccountError(409, 'This email is already signed up. Log in instead.', { field: 'email', reason: 'exists' })

      if (marketing) attendee.brevo = await syncList(uid, attendee)
      return session(uid, attendee)
    },

    // ---------- Log in ----------
    async logIn(input: { email: unknown; pin: unknown }, ip: string): Promise<Session> {
      const email = text(input.email)
      const pin = text(input.pin)
      check(emailProblem(email), 'email')
      if (!/^\d{4}$/.test(pin)) throw new AccountError(400, 'Your PIN is 4 digits.', { field: 'pin' })
      await networkBlocked(ip)

      const found = await findAccount(email)
      if (!found) {
        await networkFail(ip)
        throw new AccountError(404, 'There\'s no account with this email. Check it, or sign up.', { field: 'email', reason: 'unknown' })
      }
      const { uid, attendee } = found
      const t = now()
      const outcome = await store.updateSecret<LogInOutcome>(uid, async (s) => {
        if (s.needsReset) return { next: null, result: { kind: 'reset' } }
        if (s.lockedUntil > t) return { next: null, result: { kind: 'paused', minutes: Math.ceil((s.lockedUntil - t) / MINUTE) } }
        if (await verifyPin(pin, s.pin, pepper)) {
          return { next: s.fails || s.lockedUntil ? { ...s, fails: 0, lockedUntil: 0 } : null, result: { kind: 'ok' } }
        }
        const fails = s.fails + 1
        const next = { ...s, fails }
        if (fails >= TRIES_BEFORE_RESET) next.needsReset = true
        else if (fails % TRIES_BEFORE_PAUSE === 0) next.lockedUntil = t + PAUSE_MINUTES * MINUTE
        return { next, result: { kind: 'wrong', fails } }
      })

      if (outcome.kind === 'ok') {
        await store.updateAttendee(uid, { lastLoginAt: t })
        return session(uid, attendee)
      }
      const resetMessage = 'Too many wrong PINs. Tap "Forgot PIN?" and we\'ll email you a code to choose a new one.'
      if (outcome.kind === 'reset') throw new AccountError(423, resetMessage, { reason: 'reset' })
      if (outcome.kind === 'paused') {
        throw new AccountError(423, `Too many wrong PINs. Try again in ${plural(outcome.minutes, 'minute')}, or tap "Forgot PIN?".`, { reason: 'paused', minutes: outcome.minutes })
      }
      await networkFail(ip)
      const fails = outcome.fails
      if (fails >= TRIES_BEFORE_RESET) throw new AccountError(423, resetMessage, { reason: 'reset' })
      if (fails === TRIES_BEFORE_PAUSE) {
        throw new AccountError(423, `Wrong PIN ${TRIES_BEFORE_PAUSE} times. Wait ${PAUSE_MINUTES} minutes, or tap "Forgot PIN?" to choose a new one.`, { reason: 'paused', minutes: PAUSE_MINUTES })
      }
      const message = fails < TRIES_BEFORE_PAUSE
        ? `Wrong PIN. ${plural(TRIES_BEFORE_PAUSE - fails, 'try', 'tries')} left, then a ${PAUSE_MINUTES}-minute pause.`
        : `Wrong PIN. ${plural(TRIES_BEFORE_RESET - fails, 'try', 'tries')} left before you'll need a new PIN.`
      throw new AccountError(401, message, { field: 'pin', reason: 'wrong' })
    },

    // ---------- Forgot PIN: email a code ----------
    async sendCode(input: { email: unknown }, ip: string): Promise<{ sentTo: string }> {
      const email = text(input.email)
      check(emailProblem(email), 'email')
      if (!mail.ready && !deps.printCodes) {
        throw new AccountError(503, 'We can\'t send emails yet. Ask at an AFRIFF help desk, or try again later.', { reason: 'no-email' })
      }
      if (ip && (await store.count(`code-${ip}`, HOUR, 1, now())) > NETWORK_LIMITS.codes) {
        throw new AccountError(429, 'Too many codes asked for from this network. Try again in an hour.', { reason: 'network' })
      }
      const found = await findAccount(email)
      if (!found) throw new AccountError(404, 'There\'s no account with this email. Check it, or sign up.', { field: 'email', reason: 'unknown' })
      const { uid, attendee } = found

      const code = newCode()
      const t = now()
      const allowed = await store.updateSecret(uid, (s) => {
        const recent = s.codesSent.filter((at) => t - at < HOUR)
        if (recent.length >= CODES_PER_HOUR) return { next: null, result: false }
        return {
          next: { ...s, codesSent: [...recent, t], code: { hash: codeHash(code, uid, pepper), expiresAt: t + CODE_MINUTES * MINUTE, tries: 0 } },
          result: true,
        }
      })
      if (!allowed) {
        throw new AccountError(429, `We've sent you ${CODES_PER_HOUR} codes in the last hour. Use the newest one, or try again later.`, { reason: 'codes' })
      }
      try {
        if (mail.ready) await mail.sendCode({ email: attendee.email, name: attendee.firstName }, code)
        else console.info(`[accounts] no email service here: the code for ${attendee.email} is ${code}`)
      } catch (e) {
        // give the try back: it never arrived
        await store.updateSecret(uid, (s) => ({ next: { ...s, code: null, codesSent: s.codesSent.filter((at) => at !== t) }, result: null }))
        console.error('[accounts] code email failed', e)
        throw new AccountError(502, 'We couldn\'t send the email just now. Try again in a minute.', { reason: 'email-failed' })
      }
      return { sentTo: maskEmail(attendee.email) }
    },

    // ---------- Forgot PIN: code + new PIN ----------
    async resetPin(input: { email: unknown; code: unknown; pin: unknown }, ip: string): Promise<Session> {
      const email = text(input.email)
      const code = text(input.code).replace(/\s/g, '')
      const pin = text(input.pin)
      check(emailProblem(email), 'email')
      if (!/^\d{6}$/.test(code)) throw new AccountError(400, 'The code is the 6 digits in the email.', { field: 'code' })
      check(pinProblem(pin), 'pin')
      await networkBlocked(ip)

      const found = await findAccount(email)
      if (!found) throw new AccountError(404, 'There\'s no account with this email. Check it, or sign up.', { field: 'email', reason: 'unknown' })
      const { uid, attendee } = found
      const t = now()
      const newPin = await hashPin(pin, pepper)
      const outcome = await store.updateSecret<ResetOutcome>(uid, (s) => {
        if (!s.code || s.code.expiresAt < t) return { next: null, result: { kind: 'expired' } }
        if (!sameCode(code, uid, pepper, s.code.hash)) {
          const tries = s.code.tries + 1
          return { next: { ...s, code: tries >= CODE_TRIES ? null : { ...s.code, tries } }, result: { kind: 'wrong', left: CODE_TRIES - tries } }
        }
        return { next: { ...s, pin: newPin, fails: 0, lockedUntil: 0, needsReset: false, code: null }, result: { kind: 'ok' } }
      })

      if (outcome.kind === 'expired') throw new AccountError(410, 'That code has expired or was already used. Ask for a new one.', { field: 'code', reason: 'expired' })
      if (outcome.kind === 'wrong') {
        await networkFail(ip)
        if (outcome.left <= 0) throw new AccountError(410, 'That code isn\'t right, and it\'s now used up. Ask for a new one.', { field: 'code', reason: 'expired' })
        throw new AccountError(401, `That code isn't right. ${plural(outcome.left, 'try', 'tries')} left.`, { field: 'code', reason: 'wrong' })
      }
      await store.updateAttendee(uid, { lastLoginAt: t })
      return session(uid, attendee)
    },

    // ---------- "Emails from AFRIFF" switch ----------
    async setMarketing(uid: string, on: unknown): Promise<PublicProfile> {
      if (typeof on !== 'boolean') throw new AccountError(400, 'Say whether emails should be on or off.')
      const a = await store.attendee(uid)
      if (!a) throw new AccountError(404, 'This account no longer exists.', { reason: 'gone' })
      if (a.marketing !== on) {
        const patch: Partial<Attendee> = { marketing: on, marketingChangedAt: now(), consentText: on ? MARKETING_CONSENT : '' }
        await store.updateAttendee(uid, patch)
        Object.assign(a, patch)
        await syncList(uid, a)
      }
      return profileOf(uid, a)
    },

    // ---------- Delete an account (the person, or an admin) ----------
    /** Returns what happened in Brevo, so an admin knows if anything is left to remove by hand. */
    async remove(uid: string): Promise<{ brevo: 'deleted' | 'not-needed' | 'failed' }> {
      const a = await store.attendee(uid)
      await store.remove(uid, a ? emailKey(a.emailLower) : null)
      await deps.dropLogin(uid).catch(() => {})
      if (!a || a.brevo === 'off' || (a.brevo === 'pending' && !list.ready)) return { brevo: 'not-needed' }
      if (!list.ready) return { brevo: 'failed' }
      try {
        await list.forget(a.email)
        return { brevo: 'deleted' }
      } catch (e) {
        console.error('[accounts] Brevo delete failed', e)
        return { brevo: 'failed' }
      }
    },

    // ---------- Admins: "Send to Brevo" ----------
    /** Sends waiting people to Brevo (or takes them off), a batch at a time. */
    async sendWaitingToBrevo(batch = 50): Promise<{ done: number; failed: number; more: boolean }> {
      if (!list.ready) throw new AccountError(503, 'Brevo isn\'t set up on the server yet (see .env.example: NUXT_BREVO_*).')
      const waiting = await store.waitingForBrevo(batch)
      let done = 0
      let failed = 0
      for (const { uid, attendee } of waiting) {
        const status = await syncList(uid, attendee)
        if (status === 'failed') failed++
        else done++
      }
      return { done, failed, more: waiting.length === batch }
    },

    /** for the phone: who this token belongs to, now */
    async profile(uid: string): Promise<PublicProfile> {
      const a = await store.attendee(uid)
      if (!a) throw new AccountError(404, 'This account no longer exists.', { reason: 'gone' })
      return profileOf(uid, a)
    },
  }
}
