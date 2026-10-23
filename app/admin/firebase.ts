// The console's and the door view's handles on Firebase.
// The app and the database are the shared ones in lib/firebase/app.ts (same
// offline cache as the attendee screens, so door-counter taps made with no
// signal are kept on the phone and sent when it's back). Sign-in (Auth) is
// only ever needed here, so `firebase/auth` stays out of the attendee download.
import { getAuth } from 'firebase/auth'
import { firebaseApp, firebaseDb } from '~/lib/firebase/app'

export const app = firebaseApp()
export const auth = getAuth(app)
export const db = firebaseDb()
