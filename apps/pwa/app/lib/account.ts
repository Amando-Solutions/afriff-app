// Attendee accounts on the phone: who's signed in, and signing up, logging
// in, Forgot PIN, the emails switch, logging out and deleting the account.
//
// The PIN check, wrong-PIN pauses and emailed codes happen on the staff app's
// server (apps/admin/server/api/account/*, a different address: adminUrl).
// After a good PIN it answers with a token, and lib/firebase/account.ts signs
// this phone in to Firebase with it. The person is then remembered here
// (localStorage) until they log out, and My Festival follows them between
// phones (lib/planSync.ts).
//
// The sign-up page shows first (middleware/account.global.ts). It never locks
// people out of the app when accounts can't work: no signal, the server
// unreachable, accounts not set up yet, or an admin switched "Require
// sign-up" off. Then "Continue for now" / "Skip for now" lets them in for this
// visit, and the page shows again next time the app is opened.
import { reactive } from 'vue'
import { currentPlan, replacePlan } from './store'
import { planIsSaved, startPlanSync, stopPlanSync } from './planSync'

const PROFILE_KEY = 'afriff-account-v1'
/** sessionStorage: let in without an account, for this visit only */
const SKIP_KEY = 'afriff-account-skip'

export interface AccountProfile {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
}

export interface AccountStatus {
  /** the server can create and check accounts */
  accounts: boolean
  /** Forgot PIN emails can be sent */
  email: boolean
  /** the console's "Require sign-up" switch */
  requireSignUp: boolean
}

interface Session {
  token: string
  profile: AccountProfile
}

/** A problem to show on the sign-up page, in plain words. */
export class AccountProblem extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 = couldn't reach the server */
    readonly status: number,
    readonly field?: string,
    readonly reason?: string,
  ) {
    super(message)
  }
}

const storage = {
  get(store: Storage | undefined, key: string) {
    try { return store?.getItem(key) ?? null } catch { return null }
  },
  set(store: Storage | undefined, key: string, value: string | null) {
    try {
      if (value === null) store?.removeItem(key)
      else store?.setItem(key, value)
    } catch { /* blocked (private mode): remembered for this visit only */ }
  },
}
const local = () => (typeof window === 'undefined' ? undefined : window.localStorage)
const session = () => (typeof window === 'undefined' ? undefined : window.sessionStorage)

function readProfile(): AccountProfile | null {
  try {
    const p = JSON.parse(storage.get(local(), PROFILE_KEY) || 'null')
    return p && typeof p.uid === 'string' && typeof p.email === 'string' ? p : null
  } catch {
    return null
  }
}

export const account = reactive({
  profile: readProfile(),
  skipped: storage.get(session(), SKIP_KEY) === '1',
})

/** Signed in, or let in without an account for this visit */
export const mayUseApp = () => Boolean(account.profile || account.skipped)

/** A ?redirect= value, only if it's an address inside this app */
export function safeRedirect(value: unknown): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/auth') ? v : null
}

function saveProfile(p: AccountProfile | null) {
  account.profile = p
  storage.set(local(), PROFILE_KEY, p ? JSON.stringify(p) : null)
}

/** "Continue for now" / "Skip for now": into the app without an account, until it's closed. */
export function skipForNow() {
  account.skipped = true
  storage.set(session(), SKIP_KEY, '1')
}

// ---------- Talking to the staff app's server ----------

let apiBase = ''

/** Called once as the app starts (plugins/account.client.ts), with the public runtime config. */
export function configureAccounts(pub: { adminUrl?: unknown }) {
  apiBase = String(pub.adminUrl || '').replace(/\/+$/, '')
}

const unreachable = () =>
  new AccountProblem(
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'You\'re offline. Connect to the internet and try again.'
      : 'We can\'t reach AFRIFF right now. Check your connection and try again.',
    0,
    undefined,
    'unreachable',
  )

function withTimeout(ms: number) {
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    // text/plain: no extra preflight round trip on slow data (see the server side)
    res = await fetch(`${apiBase}/api/account/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify(body),
      signal: withTimeout(20000),
    })
  } catch {
    throw unreachable()
  }
  const json = (await res.json().catch(() => null)) as { error?: { message?: string; field?: string; reason?: string } } | null
  if (!res.ok) {
    const e = json?.error
    if (!e?.message && res.status >= 500) throw unreachable()
    throw new AccountProblem(e?.message || `Something went wrong (${res.status}). Try again.`, res.status, e?.field, e?.reason)
  }
  return json as T
}

/** Can accounts be used now, and must people sign up? null = couldn't find out (offline, server down). */
export async function fetchAccountStatus(): Promise<AccountStatus | null> {
  if (!apiBase) return null
  try {
    const res = await fetch(`${apiBase}/api/account/status`, { signal: withTimeout(10000) })
    if (!res.ok) return null
    const s = (await res.json()) as Partial<AccountStatus>
    return { accounts: s.accounts === true, email: s.email === true, requireSignUp: s.requireSignUp !== false }
  } catch {
    return null
  }
}

// ---------- Signing in ----------

let stopWatchingSignOut: (() => void) | null = null

async function finish({ token, profile }: Session) {
  const fb = await import('./firebase/account')
  try {
    await fb.signInWithToken(token)
  } catch {
    throw new AccountProblem('Your details are saved, but this phone couldn\'t finish logging in. Check your connection, then log in.', 0, undefined, 'unreachable')
  }
  saveProfile(profile)
  account.skipped = false
  storage.set(session(), SKIP_KEY, null)
  // picks made before signing up are added to the account (planSync merges them)
  void startPlanSync(profile.uid)
  watchSignOut(fb)
}

/** If the sign-in ends by itself (account deleted, e.g. from another phone), forget it here too. */
function watchSignOut(fb: typeof import('./firebase/account')) {
  stopWatchingSignOut?.()
  stopWatchingSignOut = fb.onSignedOut(() => {
    forgetHere()
    if (typeof window !== 'undefined') window.location.assign('/auth')
  })
}

export async function signUp(form: { firstName: string; lastName: string; email: string; pin: string; marketing: boolean }) {
  await finish(await call<Session>('signup', form))
}

export async function logIn(email: string, pin: string) {
  await finish(await call<Session>('login', { email, pin }))
}

/** Forgot PIN, step 1: email a 6-digit code. Returns the (partly hidden) address it went to. */
export async function sendCode(email: string): Promise<string> {
  return (await call<{ sentTo: string }>('code', { email })).sentTo
}

/** Forgot PIN, step 2: the code and a new PIN; logs in. */
export async function resetPin(email: string, code: string, pin: string) {
  await finish(await call<Session>('reset', { email, code, pin }))
}

/**
 * On every start, for someone signed in: check Firebase still has them (it
 * reads its saved sign-in from the phone, so this works offline) and start
 * keeping My Festival in step. False = the sign-in is gone; they must log in.
 */
export async function resumeAccount(): Promise<boolean> {
  const profile = account.profile
  if (!profile) return true
  const fb = await import('./firebase/account')
  const user = await fb.signedInUser().catch(() => null)
  if (!user || user.uid !== profile.uid) {
    forgetHere()
    return false
  }
  void startPlanSync(user.uid)
  watchSignOut(fb)
  return true
}

// ---------- In My Festival ----------

/** "Emails from AFRIFF" switch: on = joins the "App subscribers" list. */
export async function setMarketing(on: boolean) {
  const fb = await import('./firebase/account')
  const idToken = await fb.idToken().catch(() => {
    throw new AccountProblem('Log in again, then try again.', 401)
  })
  saveProfile(await call<AccountProfile>('marketing', { idToken, marketing: on }))
}

/** True when everything in My Festival has reached the account (safe to log out). */
export const planSaved = () => planIsSaved(currentPlan())

/** Log out on this phone: My Festival stays in the account, and is cleared from this phone. */
export async function logOut() {
  stopWatchingSignOut?.()
  stopWatchingSignOut = null
  const fb = await import('./firebase/account')
  await fb.signOutHere().catch(() => {})
  forgetHere()
}

/** Delete the account for good (and everything in it). */
export async function deleteAccount() {
  const fb = await import('./firebase/account')
  const idToken = await fb.idToken().catch(() => {
    throw new AccountProblem('Log in again, then try again.', 401)
  })
  await call('delete', { idToken })
  await logOut()
}

/** Forget the account on this phone, and the My Festival that belonged to it. */
function forgetHere() {
  stopPlanSync(true)
  saveProfile(null)
  replacePlan({ scheduled: [], watched: {}, queuesChecked: [] })
}
