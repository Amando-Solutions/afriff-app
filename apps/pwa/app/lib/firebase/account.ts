// Attendee accounts, straight to Firebase from the phone (no server of ours):
// Firebase's own email + password sign-in (and "Continue with Google", in
// ./google.ts), its own "reset your password" email, and the person's records
// in the database:
//   attendees/{uid}       name, email, festival-emails choice ("App users").
//                         Created by the phone at sign-up; only the person and
//                         admins can read it (firestore.rules check every field).
//   attendeePlans/{uid}   their My Festival (lib/planSync.ts).
//   settings/attendeeAccounts  the console's "Require an account" switch.
// Firebase keeps the phone signed in (IndexedDB), with no signal too.
//
// Loaded with import() only when needed, so it never slows down first paint.
import {
  EmailAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type PopupRedirectResolver,
  type User,
} from 'firebase/auth'
import {
  deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe,
} from 'firebase/firestore'
import { firebaseApp, firebaseDb } from '@afriff/core/firebase/app'
import { MARKETING_CONSENT, cleanName, lagosDay, normaliseEmail } from '@afriff/core/accounts/rules'
import type { PlanData } from '@afriff/core/accounts/plans'

let auth: Auth | null = null

// initializeAuth, not getAuth: getAuth makes every phone load Google's
// sign-in helper (a hidden page from firebaseapp.com) on every start. Here it
// only loads when ./google.ts passes `popups` in, i.e. on the sign-up page
// and the delete sheet. (Firebase's pop-up code itself is in this download,
// about 4 KB: Firebase ships all its sign-in code as one file.) When that's
// what starts the sign-in (someone signed out opening the sign-up page),
// Firebase gets the Google window ready straight away on phones, so a tap
// opens it at once instead of being stopped as an unasked-for window.
export function attendeeAuth(popups?: PopupRedirectResolver): Auth {
  auth ??= initializeAuth(firebaseApp(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    popupRedirectResolver: popups,
  })
  return auth
}

/** How they sign in: decides what "Delete my account" asks for */
export type SignIn = 'password' | 'google'

export interface Profile {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
  signIn: SignIn
}

/** A Google login with no password on it confirms with Google; anything else with its password. */
export const signInOf = (user: User): SignIn =>
  !user.providerData.some((p) => p.providerId === 'password') && user.providerData.some((p) => p.providerId === 'google.com')
    ? 'google'
    : 'password'

export interface Details {
  firstName: string
  lastName: string
  marketing: boolean
}

const db = () => firebaseDb()
const attendeeDoc = (uid: string) => doc(db(), 'attendees', uid)

/** Their attendees/{uid} record, as the sign-up page fills it in (firestore.rules check each field). */
async function createRecord(user: User, d: Details): Promise<Profile> {
  const firstName = cleanName(d.firstName)
  const lastName = cleanName(d.lastName)
  const email = user.email ?? ''
  const write = () => setDoc(attendeeDoc(user.uid), {
    firstName,
    lastName,
    email,
    emailLower: normaliseEmail(email),
    marketing: d.marketing,
    optInAtSignUp: d.marketing ? 1 : 0,
    consentText: d.marketing ? MARKETING_CONSENT : '',
    marketingChangedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    createdDay: lagosDay(Date.now()),
    lastLoginAt: serverTimestamp(),
  })
  try {
    await write()
  } catch (e) {
    // just signed up: the database can still be holding the old (signed-out)
    // sign-in for a moment. Once more, with a fresh one.
    if ((e as { code?: string }).code !== 'permission-denied') throw e
    await user.getIdToken(true)
    await write()
  }
  return { uid: user.uid, firstName, lastName, email, marketing: d.marketing, signIn: signInOf(user) }
}

/**
 * Makes the Firebase login. Their name goes on the login too (displayName),
 * so if their details don't reach the database now, any phone they log in
 * on can finish setting up without asking again (lib/account.ts).
 */
export async function createLogin(email: string, password: string, d: Details): Promise<{ uid: string }> {
  db() // the database first, so it picks up the sign-in straight away
  const { user } = await createUserWithEmailAndPassword(attendeeAuth(), email.trim(), password)
  await updateProfile(user, { displayName: `${cleanName(d.firstName)} ${cleanName(d.lastName)}` }).catch(() => {})
  return { uid: user.uid }
}

/**
 * Logs in. Returns their profile, or null when the sign-in has no attendee
 * record yet (a sign-up whose details didn't save, or a staff login):
 * lib/account.ts then finishes it with finishDetails().
 */
export async function logIn(email: string, password: string): Promise<Profile | null> {
  db()
  const { user } = await signInWithEmailAndPassword(attendeeAuth(), email.trim(), password)
  return profileOf(user)
}

/** Their attendee record (and a note of this log-in), or null when there isn't one yet. */
export async function profileOf(user: User): Promise<Profile | null> {
  const snap = await getDoc(attendeeDoc(user.uid))
  if (!snap.exists()) return null
  void updateDoc(attendeeDoc(user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {})
  const a = snap.data()
  return { uid: user.uid, firstName: String(a.firstName ?? ''), lastName: String(a.lastName ?? ''), email: String(a.email ?? user.email ?? ''), marketing: a.marketing === true, signIn: signInOf(user) }
}

/** Saves the attendee record for whoever is signed in. */
export async function finishDetails(d: Details): Promise<Profile> {
  const user = await signedInUser()
  if (!user) throw Object.assign(new Error('signed-out'), { code: 'auth/user-token-expired' })
  return createRecord(user, d)
}

/**
 * Firebase's "reset your password" email: a link to Firebase's own page for
 * choosing a new password, which then offers a way back to the app.
 */
export async function sendReset(email: string) {
  const a = attendeeAuth()
  try {
    await sendPasswordResetEmail(a, email.trim(), { url: `${window.location.origin}/auth?mode=login` })
  } catch (e) {
    // this address isn't in Firebase's Authorized domains: send it without the way back
    if ((e as { code?: string }).code === 'auth/unauthorized-continue-uri') await sendPasswordResetEmail(a, email.trim())
    else throw e
  }
}

/** The "Festival emails from AFRIFF" switch: on = gets the emails admins send from the console. */
export async function setMarketing(uid: string, on: boolean) {
  await updateDoc(attendeeDoc(uid), {
    marketing: on,
    consentText: on ? MARKETING_CONSENT : '',
    marketingChangedAt: serverTimestamp(),
  })
}

/**
 * "Delete my account": their records, then their sign-in. Firebase wants
 * proof it's really them before deleting a sign-in: `confirm` is their
 * password (confirmWithPassword) or their Google account (./google.ts).
 * Someone who is also on the AFRIFF team keeps their sign-in (it's their
 * staff login too); only their attendee records go.
 */
export async function deleteAccount(confirm: (user: User) => Promise<unknown>) {
  const user = await signedInUser()
  if (!user?.email) throw Object.assign(new Error('signed-out'), { code: 'auth/user-token-expired' })
  await confirm(user)
  await deleteDoc(doc(db(), 'attendeePlans', user.uid))
  await deleteDoc(attendeeDoc(user.uid))
  const staff = await getDoc(doc(db(), 'users', user.uid)).then((s) => s.exists(), () => false)
  if (staff) await signOut(attendeeAuth())
  else await deleteUser(user)
}

/** The person types their password again, for deleteAccount() */
export const confirmWithPassword = (password: string) => (user: User) =>
  reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password))

/** The console's "Require an account to save to My Festival" switch; null = couldn't find out. */
export async function requireAccountSetting(): Promise<boolean | null> {
  try {
    const snap = await getDoc(doc(db(), 'settings', 'attendeeAccounts'))
    return snap.get('requireSignUp') !== false
  } catch {
    return null
  }
}

/** Who's signed in on this phone (after Firebase has read its saved sign-in; works offline). */
export async function signedInUser(): Promise<User | null> {
  const a = attendeeAuth()
  await a.authStateReady()
  return a.currentUser
}

/** Calls back when the sign-in ends by itself (e.g. the account was deleted on another phone). */
export function onSignedOut(cb: () => void): Unsubscribe {
  let seen = false
  return onAuthStateChanged(attendeeAuth(), (user) => {
    if (user) seen = true
    else if (seen) cb()
  })
}

export async function signOutHere() {
  await signOut(attendeeAuth())
}

// ---------- My Festival in the account ----------

export interface RemotePlan {
  /** null = nothing saved in the account yet (or, with fromCache, not known yet) */
  data: unknown | null
  /** this snapshot still has this phone's own unsent changes in it */
  pending: boolean
  /** from the phone's saved copy, not (yet) from the database */
  fromCache: boolean
}

export function watchPlan(uid: string, onPlan: (p: RemotePlan) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(db(), 'attendeePlans', uid),
    { includeMetadataChanges: true },
    (snap) => onPlan({ data: snap.exists() ? snap.data() : null, pending: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache }),
    onError,
  )
}

/**
 * Save My Festival to the account. With no signal the write waits on the
 * phone (even if the app is closed) and goes by itself later; the promise
 * resolves when the database has it.
 */
export function writePlan(uid: string, plan: PlanData): Promise<void> {
  return setDoc(doc(db(), 'attendeePlans', uid), { v: 1, updatedAt: serverTimestamp(), ...plan })
}
