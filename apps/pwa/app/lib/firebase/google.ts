// "Continue with Google" for attendees: Firebase's own Google sign-in, the way
// DP Fitness does it (DPfitPWA apps/pwa/app/lib/datasource/firestore.ts).
//
// A small Google window (pop-up) everywhere, except the iPhone Home Screen
// app: there a pop-up opens in Safari, a separate app with no way back, and
// the sign-in would never finish. So the whole page goes to Google instead and
// comes back to /auth, which finishes it (googleReturn), with the project's
// usual firebaseapp.com helper, exactly as DP Fitness does on iPhones.
// Optional hardening, if Safari's privacy rules ever lose the result on the
// way back ("didn't finish"): serve the helper from the app's own address
// (nuxt.config.ts routeRules + NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN).
//
// Loaded only on the sign-up page and the delete sheet, so the pop-up code
// isn't in the rest of the app (see attendeeAuth in ./account).
import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getAdditionalUserInfo,
  getRedirectResult,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { firebaseDb } from '@afriff/core/firebase/app'
import { attendeeAuth, profileOf, type Profile } from './account'

/** sessionStorage: the page is away at Google (and their emails choice, for when it's back). Also read by lib/account.ts backFromGoogle(). */
const PENDING_KEY = 'afriff-google-pending'
/** Firebase only deletes a sign-in made in the last 5 minutes; a little under, to be safe */
const RECENT_MS = 4 * 60_000

export interface GoogleResult {
  uid: string
  /** null = first time here: no attendee record yet */
  profile: Profile | null
  /** the name and email on their Google account, for a new attendee record */
  firstName: string
  lastName: string
  email: string
  /** "Yes, AFRIFF can email me…", if they ticked it before tapping Google (starts the box ticked) */
  marketing: boolean
}

function provider(): GoogleAuthProvider {
  const p = new GoogleAuthProvider()
  // Always ask which account: with one Google account already signed in, the
  // browser would otherwise pick it silently, and someone with a work and a
  // personal account is the only one who knows which they use for AFRIFF.
  p.setCustomParameters({ prompt: 'select_account' })
  return p
}

/** The iPhone Home Screen app, where a pop-up can't come back (Safari's own flag, true only there). */
const mustRedirect = () => (navigator as Navigator & { standalone?: boolean }).standalone === true

const pending = {
  read(): { marketing: boolean } | null {
    try {
      const p = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null')
      return p && typeof p === 'object' ? { marketing: p.marketing === true } : null
    } catch {
      return null
    }
  },
  write(marketing: boolean) {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ marketing })) } catch { /* blocked: the return trip just can't say it didn't finish */ }
  },
  clear() {
    try { sessionStorage.removeItem(PENDING_KEY) } catch { /* nothing kept */ }
  },
}

/** Setup problems say what to switch on, for whoever opens the browser console. */
function explained(e: unknown): unknown {
  const code = (e as { code?: string } | null)?.code
  if (code === 'auth/operation-not-allowed') {
    console.error('[auth] Google sign-in is off for this project: Firebase console → Authentication → Sign-in method → Google → Enable.', e)
  } else if (code === 'auth/unauthorized-domain') {
    console.error(`[auth] ${window.location.host} isn't allowed to sign in: Firebase console → Authentication → Settings → Authorized domains.`, e)
  }
  return e
}

const codeOf = (e: unknown) => (e as { code?: string } | null)?.code ?? ''

/**
 * Signs in with Google. Null = the page is on its way to Google (iPhone Home
 * Screen app, or the pop-up was blocked) and /auth finishes it on the way back.
 */
export async function googleSignIn(marketing: boolean): Promise<GoogleResult | null> {
  firebaseDb() // the database first, so it picks up the sign-in straight away
  if (mustRedirect()) return startRedirect(marketing)
  let credential: UserCredential
  try {
    credential = await signInWithPopup(attendeeAuth(browserPopupRedirectResolver), provider(), browserPopupRedirectResolver)
  } catch (e) {
    // the pop-up never opened (a blocker, or a browser without pop-ups): the whole page works in both
    if (codeOf(e) === 'auth/popup-blocked' || codeOf(e) === 'auth/operation-not-supported-in-this-environment') return startRedirect(marketing)
    throw explained(e)
  }
  return resultOf(credential, marketing)
}

async function startRedirect(marketing: boolean): Promise<null> {
  pending.write(marketing)
  try {
    await signInWithRedirect(attendeeAuth(browserPopupRedirectResolver), provider(), browserPopupRedirectResolver)
  } catch (e) {
    pending.clear()
    throw explained(e)
  }
  return null
}

/**
 * On opening /auth: the result of a trip to Google, if the page is back from
 * one (null = it isn't). Starting the sign-in here, with the pop-up code, also
 * gets the Google window ready (./account attendeeAuth).
 */
export async function googleReturn(): Promise<GoogleResult | null> {
  firebaseDb()
  const wasAway = pending.read()
  // only clear a note that was there on arrival: a tap on the button while this
  // was still asking writes a new one, for the trip that's just starting
  const done = () => { if (wasAway) pending.clear() }
  let credential: UserCredential | null
  try {
    credential = await getRedirectResult(attendeeAuth(browserPopupRedirectResolver), browserPopupRedirectResolver)
  } catch (e) {
    done()
    throw explained(e)
  }
  done()
  if (credential) return resultOf(credential, wasAway?.marketing ?? false)
  // went to Google and came back with nothing: they backed out, or the browser lost it on the way
  if (wasAway) throw Object.assign(new Error('Google sign-in did not finish'), { code: 'google/unfinished' })
  return null
}

async function resultOf(credential: UserCredential, marketing: boolean): Promise<GoogleResult> {
  const google = getAdditionalUserInfo(credential)?.profile ?? {}
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  // Google's own first / last name; otherwise split the full name at the last space
  const full = text(credential.user.displayName).replace(/\s+/g, ' ')
  const cut = full.lastIndexOf(' ')
  return {
    uid: credential.user.uid,
    profile: await profileOf(credential.user),
    firstName: text(google.given_name) || (cut > 0 ? full.slice(0, cut) : full),
    lastName: text(google.family_name) || (cut > 0 ? full.slice(cut + 1) : ''),
    email: credential.user.email ?? '',
    marketing,
  }
}

/**
 * "Delete my account" for someone who signs in with Google: Firebase wants a
 * fresh Google sign-in first, in a pop-up. Where there can't be one (iPhone
 * Home Screen app, pop-up blocked), Firebase still accepts a sign-in from the
 * last few minutes; older than that, they're asked to log in again first.
 */
export async function confirmWithGoogle(user: User): Promise<void> {
  if (!mustRedirect()) {
    try {
      await reauthenticateWithPopup(user, provider(), browserPopupRedirectResolver)
      return
    } catch (e) {
      if (codeOf(e) !== 'auth/popup-blocked' && codeOf(e) !== 'auth/operation-not-supported-in-this-environment') throw explained(e)
    }
  }
  const { authTime } = await user.getIdTokenResult()
  if (Date.now() - Date.parse(authTime) > RECENT_MS) throw Object.assign(new Error('Google sign-in too old'), { code: 'google/log-in-again' })
}
