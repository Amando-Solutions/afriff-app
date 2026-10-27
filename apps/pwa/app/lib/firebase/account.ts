// Attendee accounts, straight to Firebase from the phone (no server of ours):
// Firebase's own email + password sign-in, its own "reset your password"
// email, and the person's records in the database:
//   attendees/{uid}       name, email, festival-emails choice ("App users").
//                         Created by the phone at sign-up; only the person and
//                         admins can read it (firestore.rules check every field).
//   attendeePlans/{uid}   their My Festival (lib/planSync.ts).
//   brevoRemovals/{uid}   left behind when someone deletes their account, so
//                         the console's "Send to Brevo" also takes them off Brevo.
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
  type User,
} from 'firebase/auth'
import {
  deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe,
} from 'firebase/firestore'
import { firebaseApp, firebaseDb } from '@afriff/core/firebase/app'
import { MARKETING_CONSENT, cleanName, lagosDay, normaliseEmail } from '@afriff/core/accounts/rules'
import type { PlanData } from '@afriff/core/accounts/plans'

let auth: Auth | null = null

// initializeAuth, not getAuth: only what's needed here (no pop-up sign-in
// code), which keeps the download small on slow data.
function attendeeAuth(): Auth {
  auth ??= initializeAuth(firebaseApp(), { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] })
  return auth
}

export interface Profile {
  uid: string
  firstName: string
  lastName: string
  email: string
  marketing: boolean
}

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
  await setDoc(attendeeDoc(user.uid), {
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
    // the console's "Send to Brevo" adds ticked people to the "App subscribers" list
    brevo: d.marketing ? 'pending' : 'off',
    brevoError: '',
  })
  return { uid: user.uid, firstName, lastName, email, marketing: d.marketing }
}

export async function signUp(email: string, password: string, d: Details): Promise<Profile> {
  db() // the database first, so it picks up the sign-in straight away
  const { user } = await createUserWithEmailAndPassword(attendeeAuth(), email.trim(), password)
  void updateProfile(user, { displayName: `${cleanName(d.firstName)} ${cleanName(d.lastName)}` }).catch(() => {})
  return createRecord(user, d)
}

/**
 * Logs in. Returns their profile, or null when the sign-in has no attendee
 * record yet (a staff login, or a sign-up whose details didn't save): the
 * sign-up page then asks for their name with finishDetails().
 */
export async function logIn(email: string, password: string): Promise<Profile | null> {
  db()
  const { user } = await signInWithEmailAndPassword(attendeeAuth(), email.trim(), password)
  const snap = await getDoc(attendeeDoc(user.uid))
  if (!snap.exists()) return null
  void updateDoc(attendeeDoc(user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {})
  const a = snap.data()
  return { uid: user.uid, firstName: String(a.firstName ?? ''), lastName: String(a.lastName ?? ''), email: String(a.email ?? user.email ?? ''), marketing: a.marketing === true }
}

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

/** The "Festival emails from AFRIFF" switch. */
export async function setMarketing(uid: string, on: boolean) {
  await updateDoc(attendeeDoc(uid), {
    marketing: on,
    consentText: on ? MARKETING_CONSENT : '',
    marketingChangedAt: serverTimestamp(),
    brevo: 'pending', // the console's "Send to Brevo" adds or removes them
    brevoError: '',
  })
}

/**
 * "Delete my account": their records, then their sign-in. Firebase asks for
 * the password again before deleting a sign-in, so the person types it.
 * Someone who is also on the AFRIFF team keeps their sign-in (it's their
 * staff login too); only their attendee records go.
 */
export async function deleteAccount(password: string) {
  const user = await signedInUser()
  if (!user?.email) throw Object.assign(new Error('signed-out'), { code: 'auth/user-token-expired' })
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
  const record = await getDoc(attendeeDoc(user.uid))
  if (record.exists() && record.get('brevo') !== 'off') {
    await setDoc(doc(db(), 'brevoRemovals', user.uid), { email: user.email, at: serverTimestamp() })
  }
  await deleteDoc(doc(db(), 'attendeePlans', user.uid))
  await deleteDoc(attendeeDoc(user.uid))
  const staff = await getDoc(doc(db(), 'users', user.uid)).then((s) => s.exists(), () => false)
  if (staff) await signOut(attendeeAuth())
  else await deleteUser(user)
}

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
