// Attendee accounts on the phone: who's signed in, and signing up, logging
// in, "Forgot password?", the emails switch, logging out and deleting the
// account.
//
// FIREBASE DOES THE SIGN-IN ITSELF (user decision 27 Oct; replaces an earlier
// 4-digit PIN checked by our server): email + password, Firebase's own protection
// against guessing, and Firebase's own "reset your password" email with a
// link. The phone talks to Firebase directly (lib/firebase/account.ts), so
// accounts don't depend on the staff app being up. The person is remembered
// here (localStorage) and by Firebase until they log out, and My Festival
// follows them between phones (lib/planSync.ts).
//
// WHEN IT'S ASKED FOR (user decision 27 Oct): anyone can browse the whole app
// without an account. Saving to My Festival (+ on a screening or event,
// "Seen it" on a film) asks first: with no account, the person goes to the
// sign-up page (/auth), and what they tapped is saved once they've signed up
// or logged in (plugins/account.client.ts, lib/store.ts guardSaves).
// With no internet, signing up can't happen, so the tap shows a short message
// instead (plugins/account.client.ts) and nothing is saved. It doesn't ask
// at all when an admin switches "Require an account" off (console → Attendees).
import { reactive } from 'vue'
import { applySave, currentPlan, replacePlan, type SaveIntent } from './store'
import { planIsSaved, startPlanSync, stopPlanSync } from './planSync'

const PROFILE_KEY = 'afriff-account-v1'
/** sessionStorage: what they tapped before being sent to sign up */
const PENDING_KEY = 'afriff-save-after-signup'

export interface AccountProfile {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
}

/** A problem to show on the sign-up page, in plain words. */
export class AccountProblem extends Error {
  constructor(
    message: string,
    readonly field?: string,
    /** 'exists' | 'wrong' | 'paused' | 'unreachable' | 'signed-out' | 'details' */
    readonly reason?: string,
  ) {
    super(message)
  }
}

/** Firebase's error codes, in plain words (and which field to point at). */
const PROBLEMS: Record<string, [string, string | undefined, string | undefined]> = {
  'auth/email-already-in-use': ['This email is already signed up. Log in instead.', 'email', 'exists'],
  'auth/invalid-email': ['That doesn’t look like an email address.', 'email', undefined],
  'auth/missing-email': ['Type your email.', 'email', undefined],
  'auth/weak-password': ['Choose a longer password (at least 8 characters).', 'password', undefined],
  'auth/missing-password': ['Type your password.', 'password', undefined],
  'auth/invalid-credential': ['That email and password don’t match. Check them, or tap “Forgot password?”.', 'password', 'wrong'],
  'auth/invalid-login-credentials': ['That email and password don’t match. Check them, or tap “Forgot password?”.', 'password', 'wrong'],
  'auth/wrong-password': ['That password isn’t right. Check it, or tap “Forgot password?”.', 'password', 'wrong'],
  'auth/user-not-found': ['That email and password don’t match. Check them, or sign up.', 'password', 'wrong'],
  'auth/too-many-requests': ['Too many tries. Wait a few minutes, or reset your password.', undefined, 'paused'],
  'auth/user-disabled': ['This account has been switched off. Contact AFRIFF.', undefined, undefined],
  'auth/network-request-failed': ['', undefined, 'unreachable'],
  'auth/requires-recent-login': ['Log in again, then try again.', undefined, 'signed-out'],
  'auth/user-token-expired': ['Log in again, then try again.', undefined, 'signed-out'],
  'permission-denied': ['Your details couldn’t be saved. Log in again, then try again.', undefined, 'signed-out'],
  unavailable: ['', undefined, 'unreachable'],
}

function problemFrom(e: unknown): AccountProblem {
  if (e instanceof AccountProblem) return e
  const code = String((e as { code?: unknown } | null)?.code ?? '').replace(/^firestore\//, '')
  const [message, field, reason] = PROBLEMS[code] ?? [`Something went wrong (${code || 'unknown'}). Try again.`, undefined, undefined]
  if (reason === 'unreachable' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return new AccountProblem(
      typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'You’re offline. Connect to the internet and try again.'
        : 'We can’t reach AFRIFF right now. Check your connection and try again.',
      undefined,
      'unreachable',
    )
  }
  return new AccountProblem(message, field, reason)
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
  /** the console's "Require an account" switch, read as the app starts; null = not known (yet) */
  required: null as boolean | null,
})

/** Saving to My Festival can go ahead without asking. */
export const canSaveNow = () => Boolean(account.profile || account.required === false)

/** Read the console's switch (once, as the app starts). */
export async function loadAccountSetting() {
  const fb = await import('./firebase/account')
  account.required = await fb.requireAccountSetting()
}

// ---------- What they tapped before signing up ----------

/** Remember what they tapped, to save it after they sign up. */
export function rememberSave(intent: SaveIntent) {
  storage.set(session(), PENDING_KEY, JSON.stringify(intent))
}

function readPending(): SaveIntent | null {
  try {
    const p = JSON.parse(storage.get(session(), PENDING_KEY) || 'null')
    return p && (p.kind === 'plan' || p.kind === 'seen') && typeof p.id === 'string' ? p : null
  } catch {
    return null
  }
}

/** What's waiting to be saved (for the sign-up page's wording), without taking it. */
export const pendingSave = readPending

/** Left the sign-up page without signing up: nothing is saved. */
export const dropPendingSave = () => storage.set(session(), PENDING_KEY, null)

function savePending() {
  const p = readPending()
  dropPendingSave()
  if (p) applySave(p)
}

/** A ?redirect= value, only if it's an address inside this app */
export function safeRedirect(value: unknown): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/auth') ? v : null
}

function saveProfile(p: AccountProfile | null) {
  account.profile = p
  storage.set(local(), PROFILE_KEY, p ? JSON.stringify(p) : null)
}

// ---------- Signing up and in ----------

let stopWatchingSignOut: (() => void) | null = null

function signedIn(fb: typeof import('./firebase/account'), profile: AccountProfile) {
  saveProfile(profile)
  // picks made before signing up are added to the account (planSync merges them),
  // and so is whatever they tapped that sent them here
  void startPlanSync(profile.uid)
  savePending()
  watchSignOut(fb)
}

/** If the sign-in ends by itself (account deleted, e.g. from another phone), forget it here too. */
function watchSignOut(fb: typeof import('./firebase/account')) {
  stopWatchingSignOut?.()
  stopWatchingSignOut = fb.onSignedOut(() => {
    forgetHere()
    if (typeof window !== 'undefined') window.location.assign('/')
  })
}

export async function signUp(form: { firstName: string; lastName: string; email: string; password: string; marketing: boolean }) {
  const fb = await import('./firebase/account')
  try {
    signedIn(fb, await fb.signUp(form.email, form.password, form))
  } catch (e) {
    // the sign-in was made but the details didn't save (signal dropped):
    // the sign-up page asks to save them again (finishDetails)
    if (await fb.signedInUser().catch(() => null)) {
      throw new AccountProblem('Your account is made. Save your details to finish.', undefined, 'details')
    }
    throw problemFrom(e)
  }
}

/**
 * Logs in. Throws reason 'details' when the sign-in is fine but there's no
 * attendee record yet (a staff login, or details that didn't save): the
 * sign-up page then asks for their name (finishDetails).
 */
export async function logIn(email: string, password: string) {
  const fb = await import('./firebase/account')
  let profile: AccountProfile | null
  try {
    profile = await fb.logIn(email, password)
  } catch (e) {
    throw problemFrom(e)
  }
  if (!profile) throw new AccountProblem('One more step: tell us your name.', undefined, 'details')
  signedIn(fb, profile)
}

export async function finishDetails(form: { firstName: string; lastName: string; marketing: boolean }) {
  const fb = await import('./firebase/account')
  try {
    signedIn(fb, await fb.finishDetails(form))
  } catch (e) {
    throw problemFrom(e)
  }
}

/** Closed the "tell us your name" step: don't stay half signed in. */
export async function cancelDetails() {
  const fb = await import('./firebase/account')
  await fb.signOutHere().catch(() => {})
}

/** "Forgot password?": Firebase emails a link to choose a new one. */
export async function sendResetLink(email: string) {
  const fb = await import('./firebase/account')
  try {
    await fb.sendReset(email)
  } catch (e) {
    // an unknown email isn't an error people need to see (and Firebase may not say)
    if ((e as { code?: string }).code === 'auth/user-not-found') return
    throw problemFrom(e)
  }
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

/** "Festival emails from AFRIFF" switch: on = "App subscribers" (sent to Brevo from the console). */
export async function setMarketing(on: boolean) {
  const p = account.profile
  if (!p) throw new AccountProblem('Log in again, then try again.', undefined, 'signed-out')
  const fb = await import('./firebase/account')
  try {
    await fb.setMarketing(p.uid, on)
  } catch (e) {
    throw problemFrom(e)
  }
  saveProfile({ ...p, marketing: on })
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

/** Delete the account for good (and everything in it). Firebase wants the password again first. */
export async function deleteAccount(password: string) {
  stopWatchingSignOut?.()
  stopWatchingSignOut = null
  const fb = await import('./firebase/account')
  try {
    await fb.deleteAccount(password)
  } catch (e) {
    const user = await fb.signedInUser().catch(() => null)
    if (user) watchSignOut(fb)
    throw problemFrom(e)
  }
  forgetHere()
}

/** Forget the account on this phone, and the My Festival that belonged to it. */
function forgetHere() {
  stopPlanSync(true)
  saveProfile(null)
  replacePlan({ scheduled: [], watched: {}, queuesChecked: [] })
}
