// The attendee's Firebase sign-in, and their My Festival in the database.
//
// The PIN is checked by the staff app's server (it can count wrong tries and
// pause the account, which Firebase's own sign-in can't), which answers with a
// one-time token; this file signs the phone in to Firebase with it. Firebase
// then keeps the phone signed in (IndexedDB), with no signal too, and the
// database knows who's asking, so firestore.rules let each person reach only
// their own attendeePlans/{uid}.
//
// Loaded with import() only when someone signs in, or after the first screen
// for people already signed in, so it never slows down first paint.
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore'
import { firebaseApp, firebaseDb } from '@afriff/core/firebase/app'
import type { PlanData } from '@afriff/core/accounts/plans'

let auth: Auth | null = null

// initializeAuth, not getAuth: only what's needed here (no pop-up sign-in
// code), which keeps the download small on slow data.
function attendeeAuth(): Auth {
  auth ??= initializeAuth(firebaseApp(), { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] })
  return auth
}

export async function signInWithToken(token: string): Promise<string> {
  firebaseDb() // the database first, so it picks up the sign-in straight away
  const { user } = await signInWithCustomToken(attendeeAuth(), token)
  return user.uid
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

/** Proof of who this is, for the staff app's server (emails switch, delete account). */
export async function idToken(): Promise<string> {
  const user = await signedInUser()
  if (!user) throw new Error('signed-out')
  return user.getIdToken()
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
    doc(firebaseDb(), 'attendeePlans', uid),
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
  return setDoc(doc(firebaseDb(), 'attendeePlans', uid), { v: 1, updatedAt: serverTimestamp(), ...plan })
}
