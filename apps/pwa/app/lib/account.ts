// Attendee accounts on the phone: who's signed in, and signing up, logging
// in, "Forgot password?", the emails switch, logging out and deleting the
// account.
//
// FIREBASE DOES THE SIGN-IN ITSELF (user decision 27 Oct; replaces an earlier
// 4-digit PIN checked by our server): email + password, Firebase's own protection
// against guessing, and Firebase's own "reset your password" email with a
// link. Or "Continue with Google" (user request 27 Oct, as in DP Fitness:
// lib/firebase/google.ts): one tap to log in; the first time, a short
// "Finish signing up" step (name, festival emails box) makes the account.
// The phone talks to Firebase directly (lib/firebase/account.ts), so
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
import { cleanName, nameProblem } from '@afriff/core/accounts/rules'
import { firebaseConfig } from '@afriff/core/firebase/config'
import { applySave, currentPlan, replacePlan, type SaveIntent } from './store'
import { planIsSaved, startPlanSync, stopPlanSync } from './planSync'
import { setAlertsOwner } from './push'

const PROFILE_KEY = 'afriff-account-v1'
/** sessionStorage: what they tapped before being sent to sign up */
const PENDING_KEY = 'afriff-save-after-signup'
/** localStorage: the sign-up form's details, until they've reached the database */
const DETAILS_KEY = 'afriff-signup-details'

export interface AccountProfile {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
  /** how they sign in, for "Delete my account" (missing on phones signed in before Google: password) */
  signIn?: 'password' | 'google'
}

type Details = { firstName: string; lastName: string; marketing: boolean }

/** A problem to show on the sign-up page, in plain words. */
export class AccountProblem extends Error {
  constructor(
    message: string,
    readonly field?: string,
    /**
     * 'exists' | 'wrong' | 'paused' | 'unreachable' | 'signed-out' | 'details' (no name known: ask) |
     * 'unfinished' (details known, not saved yet: Try again) | 'cancelled' (closed the Google window: say nothing)
     */
    readonly reason?: string,
    /** 'details' after Google: what Google told us, to start the "Finish signing up" step with */
    readonly known?: Details & { email: string },
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
  'auth/invalid-credential': ['That email and password don’t match. Check them, or tap “Forgot password?”. Signed up with Google? Use “Continue with Google”.', 'password', 'wrong'],
  'auth/invalid-login-credentials': ['That email and password don’t match. Check them, or tap “Forgot password?”. Signed up with Google? Use “Continue with Google”.', 'password', 'wrong'],
  'auth/wrong-password': ['That password isn’t right. Check it, or tap “Forgot password?”. Signed up with Google? Use “Continue with Google”.', 'password', 'wrong'],
  'auth/user-not-found': ['That email and password don’t match. Check them, or sign up.', 'password', 'wrong'],
  'auth/too-many-requests': ['Too many tries. Wait a few minutes, or reset your password.', undefined, 'paused'],
  'auth/user-disabled': ['This account has been switched off. Contact AFRIFF.', undefined, undefined],
  'auth/network-request-failed': ['', undefined, 'unreachable'],
  'auth/requires-recent-login': ['Log in again, then try again.', undefined, 'signed-out'],
  'auth/user-token-expired': ['Log in again, then try again.', undefined, 'signed-out'],
  'permission-denied': ['Your details couldn’t be saved. Log in again, then try again.', undefined, 'signed-out'],
  unavailable: ['', undefined, 'unreachable'],
  // ---------- Continue with Google (lib/firebase/google.ts) ----------
  // closed the Google window, or tapped twice: their choice, not a problem
  'auth/popup-closed-by-user': ['', undefined, 'cancelled'],
  'auth/cancelled-popup-request': ['', undefined, 'cancelled'],
  'auth/user-cancelled': ['', undefined, 'cancelled'],
  // a password account with this email that Firebase won't join to Google on Google's word
  // (it does for Gmail addresses, and refuses for the rest)
  'auth/account-exists-with-different-credential': ['This email already has an AFRIFF account with a password. Log in with your email and password.', undefined, 'exists'],
  'auth/operation-not-allowed': ['Google sign-in isn’t switched on yet. Use your email for now.', undefined, undefined],
  'auth/unauthorized-domain': ['Google sign-in doesn’t work from this address yet. Use your email for now.', undefined, undefined],
  'auth/web-storage-unsupported': ['This browser is blocking what Google sign-in needs (private browsing?). Use your email instead.', undefined, undefined],
  'auth/user-mismatch': ['That’s a different Google account. Choose the one you use for AFRIFF.', undefined, undefined],
  'google/unfinished': ['Google sign-in didn’t finish. Try again, or use your email.', undefined, undefined],
  'google/log-in-again': ['To delete your account, first log out, log in again with Google, then delete it straight away.', undefined, undefined],
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

/** Instagram, Facebook, TikTok, Snapchat, LinkedIn and Android apps' built-in browsers, where Google refuses to sign anyone in */
const IN_APP_BROWSER = /Instagram|FBAN|FBAV|FB_IAB|FB4A|Snapchat|musical_ly|BytedanceWebview|TikTok|LinkedInApp|Line\/|; wv\)/i

/**
 * Can "Continue with Google" work here?
 *   'ok'     yes
 *   'in-app' inside another app's built-in browser: Google says no there, so the page says why
 *   'off'    the iPhone Home Screen app, until Google sign-in is served from the app's own
 *            address (lib/firebase/google.ts); everyone there still has email + password
 */
export function googleSignInHere(): 'ok' | 'in-app' | 'off' {
  if (typeof window === 'undefined') return 'off'
  if (IN_APP_BROWSER.test(navigator.userAgent)) return 'in-app'
  const homeScreenIphone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (homeScreenIphone) {
    try {
      if (firebaseConfig().authDomain !== window.location.host) return 'off'
    } catch {
      return 'off'
    }
  }
  return 'ok'
}

/** The page is just back from Google (lib/firebase/google.ts keeps this note while it's away). */
export const backFromGoogle = () => storage.get(session(), 'afriff-google-pending') !== null

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
  // with alerts on, invitations sent to them reach this phone too
  setAlertsOwner(profile.uid)
}

/** If the sign-in ends by itself (account deleted, e.g. from another phone), forget it here too. */
function watchSignOut(fb: typeof import('./firebase/account')) {
  stopWatchingSignOut?.()
  stopWatchingSignOut = fb.onSignedOut(() => {
    forgetHere()
    if (typeof window !== 'undefined') window.location.assign('/')
  })
}

/** The sign-up form's details, kept on this phone until they reach the database */
function keepDetails(uid: string, d: Details | null) {
  storage.set(local(), DETAILS_KEY, d ? JSON.stringify({ uid, firstName: d.firstName, lastName: d.lastName, marketing: d.marketing }) : null)
}

/**
 * What we already know about someone whose details haven't reached the
 * database: what they typed at sign-up on this phone, or else the name on
 * their Firebase login (any phone; emails choice then off, they can switch
 * it on in My Festival). Null = no name known: ask ("One more step").
 */
function knownDetails(user: { uid: string; displayName: string | null }): Details | null {
  try {
    const kept = JSON.parse(storage.get(local(), DETAILS_KEY) || 'null')
    if (kept?.uid === user.uid && typeof kept.firstName === 'string' && typeof kept.lastName === 'string') {
      return { firstName: kept.firstName, lastName: kept.lastName, marketing: kept.marketing === true }
    }
  } catch { /* damaged: try the login's name */ }
  const name = (user.displayName ?? '').replace(/\s+/g, ' ').trim()
  const cut = name.lastIndexOf(' ')
  const firstName = name.slice(0, cut)
  const lastName = name.slice(cut + 1)
  if (cut < 1 || nameProblem(firstName, 'first name') || nameProblem(lastName, 'last name')) return null
  return { firstName, lastName, marketing: false }
}

/**
 * Saves the attendee record from details we already have. If it can't be
 * saved now, the sign-up page offers "Try again" (finishSetup), never the
 * name form again: the details stay on this phone and on the login.
 */
async function finishWith(fb: typeof import('./firebase/account'), uid: string, d: Details) {
  keepDetails(uid, d)
  try {
    signedIn(fb, await fb.finishDetails(d))
  } catch (e) {
    const p = problemFrom(e)
    // the sign-in itself has ended: log in again (the details stay on this phone).
    // The database saying no (permission-denied) isn't that: they're signed in.
    if (p.reason === 'signed-out' && (e as { code?: string } | null)?.code !== 'permission-denied') throw p
    throw new AccountProblem(
      p.reason === 'unreachable'
        ? 'Your account is made, but your details couldn’t be saved with no connection. Try again when you’re back online.'
        : 'Your account is made, but we couldn’t finish setting it up just now. Try again in a moment.',
      undefined,
      'unfinished',
    )
  }
  keepDetails(uid, null)
}

export async function signUp(form: { firstName: string; lastName: string; email: string; password: string; marketing: boolean }) {
  const fb = await import('./firebase/account')
  const details: Details = { firstName: form.firstName, lastName: form.lastName, marketing: form.marketing }
  let uid: string
  try {
    ({ uid } = await fb.createLogin(form.email, form.password, details))
  } catch (e) {
    throw problemFrom(e)
  }
  await finishWith(fb, uid, details)
}

/**
 * Logs in. A sign-in with no attendee record yet (details that didn't save
 * at sign-up) is finished from what we already know; only when no name is
 * known (e.g. an AFRIFF team login) does it throw 'details' to ask for it.
 */
export async function logIn(email: string, password: string) {
  const fb = await import('./firebase/account')
  let profile: AccountProfile | null
  try {
    profile = await fb.logIn(email, password)
  } catch (e) {
    throw problemFrom(e)
  }
  if (profile) return signedIn(fb, profile)
  await finishSetup()
}

// ---------- Continue with Google ----------

/**
 * "Continue with Google": signs up or logs in, whichever it is. `marketing` =
 * they ticked "Yes, AFRIFF can email me…" before tapping it (sign-up only).
 * False = the page is on its way to Google and /auth finishes it on the way
 * back (resumeGoogle).
 */
export async function continueWithGoogle(marketing: boolean): Promise<boolean> {
  const g = await import('./firebase/google')
  let result
  try {
    result = await g.googleSignIn(marketing)
  } catch (e) {
    throw problemFrom(e)
  }
  if (!result) return false
  await afterGoogle(result)
  return true
}

/** On opening /auth: finishes a trip to Google if the page is back from one. False = it isn't. */
export async function resumeGoogle(): Promise<boolean> {
  const g = await import('./firebase/google')
  let result
  try {
    result = await g.googleReturn()
  } catch (e) {
    throw problemFrom(e)
  }
  if (!result) return false
  await afterGoogle(result)
  return true
}

/**
 * Signed in with Google. Someone who already has an account is in. The first
 * time, the sign-up page shows "Finish signing up" (user decision 27 Oct):
 * their name from Google (to check), the UNTICKED "Yes, AFRIFF can email me…"
 * box (ticked only if they ticked it before tapping Google) and the privacy
 * note, as the email form has. The attendee record is only made when they
 * press "Create my account" (finishDetails), so its emails choice, consent
 * wording and `optInAtSignUp` are what they chose there, the same as an email
 * sign-up. "Not now" signs them out again (cancelDetails): no record.
 */
async function afterGoogle(r: import('./firebase/google').GoogleResult) {
  const fb = await import('./firebase/account')
  if (r.profile) return signedIn(fb, r.profile)
  throw new AccountProblem('', undefined, 'details', {
    firstName: cleanName(r.firstName),
    lastName: cleanName(r.lastName),
    email: r.email,
    marketing: r.marketing,
  })
}

/** The delete sheet, for someone who signs in with Google: the Google code downloaded before the tap. */
export async function loadGoogle() {
  await import('./firebase/google')
}

/** "Try again" after an account was made but its details didn't save: no questions asked. */
export async function finishSetup() {
  const fb = await import('./firebase/account')
  const user = await fb.signedInUser().catch(() => null)
  if (!user) throw new AccountProblem('Log in again, then try again.', undefined, 'signed-out')
  const known = knownDetails(user)
  if (!known) throw new AccountProblem('One more step: tell us your name.', undefined, 'details')
  await finishWith(fb, user.uid, known)
}

/** The "One more step" form: the name of someone signed in whose name we don't know. */
export async function finishDetails(form: Details) {
  const fb = await import('./firebase/account')
  const user = await fb.signedInUser().catch(() => null)
  if (!user) throw new AccountProblem('Log in again, then try again.', undefined, 'signed-out')
  await finishWith(fb, user.uid, form)
}

/** Closed the "tell us your name" or "Try again" step: don't stay half signed in. */
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
  if (!profile) {
    setAlertsOwner(null)
    return true
  }
  const fb = await import('./firebase/account')
  const user = await fb.signedInUser().catch(() => null)
  if (!user || user.uid !== profile.uid) {
    forgetHere()
    return false
  }
  // e.g. a Gmail address that signed up with a password, then used Google (Firebase joins them)
  const signIn = fb.signInOf(user)
  if (profile.signIn !== signIn) saveProfile({ ...profile, signIn })
  void startPlanSync(user.uid)
  watchSignOut(fb)
  setAlertsOwner(user.uid)
  return true
}

// ---------- In My Festival ----------

/** "Festival emails from AFRIFF" switch: on = gets the emails admins send from the console (Festival emails). */
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

/**
 * Delete the account for good (and everything in it). Firebase wants proof
 * first: their password, or (password null) their Google account.
 */
export async function deleteAccount(password: string | null) {
  stopWatchingSignOut?.()
  stopWatchingSignOut = null
  const fb = await import('./firebase/account')
  try {
    const confirm = password === null ? (await import('./firebase/google')).confirmWithGoogle : fb.confirmWithPassword(password)
    await fb.deleteAccount(confirm)
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
  setAlertsOwner(null)
  saveProfile(null)
  replacePlan({ scheduled: [], watched: {}, queuesChecked: [] })
}
