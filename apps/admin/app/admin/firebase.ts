// The console's and the door view's handles on Firebase.
// The app and the database are the shared ones in @afriff/core (same offline
// cache as the attendee app, so door-counter taps made with no signal are kept
// on the phone and sent when it's back). Sign-in (Auth) is only ever needed in
// this app, so `firebase/auth` never reaches the attendee app.
import { getAuth } from 'firebase/auth'
import { firebaseApp, firebaseDb } from '@afriff/core/firebase/app'

export const app = firebaseApp()
export const auth = getAuth(app)
export const db = firebaseDb()
