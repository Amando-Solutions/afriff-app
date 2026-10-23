// The Firebase app and the Firestore database, set up once for the whole app
// (attendee screens, the admin console and the door view all share them).
//
// Attendees' phones talk to Firestore DIRECTLY with the Firebase SDK: no server
// route in between. What makes that work offline is the cache below.
//
// THE OFFLINE CACHE. Firestore's default cache lives in memory and is gone on
// every reload, so a phone that had the programme yesterday would open to
// nothing in a cinema with no signal. `persistentLocalCache` keeps it in the
// phone's IndexedDB instead:
//   - anything read once can be read again with no connection,
//   - anything written with no connection (usage counts, door-counter taps)
//     is queued on the phone, survives the app being closed, and is sent by
//     itself when the connection comes back,
//   - live listeners (`onSnapshot`) answer straight away from the cache, then
//     catch up as soon as the phone is back online. Reconnecting is the SDK's
//     job; nothing here has to retry.
//
// `persistentMultipleTabManager` because this is a website as well as an
// installed app: with the single-tab manager a second open tab can't get the
// cache and silently falls back to memory.
//
// Private windows and browsers with site data blocked can't give out IndexedDB
// at all. Those visits fall back to the memory cache: worse offline, not broken.
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { firebaseConfig } from './config'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let persistent = false

export function firebaseApp(): FirebaseApp {
  if (app) return app
  app = getApps().length ? getApp() : initializeApp(firebaseConfig())
  return app
}

/**
 * The database, with its cache on the phone. Memoised: `initializeFirestore`
 * may only run once, and never after a `getFirestore` for the same app.
 */
export function firebaseDb(): Firestore {
  if (db) return db
  const instance = firebaseApp()
  try {
    db = initializeFirestore(instance, {
      // blank optional fields in the console are skipped instead of throwing
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
    persistent = true
  } catch (cause) {
    console.warn('[firebase] offline cache unavailable here; this visit only keeps data in memory.', cause)
    db = getFirestore(instance)
  }
  keepStorage()
  return db
}

/** Whether this visit has the on-phone cache (false in private windows). */
export const hasOfflineCache = () => persistent

/**
 * Ask the browser not to clear our storage when the phone runs low on space.
 * Only from the installed app: there Chrome and Safari decide silently, while
 * Firefox in a normal tab would show a permission prompt for it.
 */
function keepStorage() {
  try {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) void navigator.storage?.persist?.().catch(() => {})
  } catch {
    /* not supported: nothing to do */
  }
}
