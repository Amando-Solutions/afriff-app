// This phone's push address (an FCM registration token), from Firebase Cloud
// Messaging. Loaded with a dynamic import() only when alerts are on or being
// turned on (app/lib/push.ts), so the messaging SDK never delays first paint.
//
// The token is tied to the app's own service worker (the one that keeps it
// offline), which shows the notifications (public/push-sw.js). FCM keeps the
// token on the phone and renews it by itself about once a week; getToken()
// hands back the current one.
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { firebaseApp } from '@afriff/core/firebase/app'

/** The app's service worker, once it's running (it registers after the page loads). */
function serviceWorker(): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The app is still installing. Try again in a moment.')), 15000)),
  ])
}

export async function pushToken(vapidKey: string): Promise<string> {
  if (!(await isSupported())) throw new Error('This browser can\'t receive alerts.')
  return getToken(getMessaging(firebaseApp()), { vapidKey, serviceWorkerRegistration: await serviceWorker() })
}

/** Stops this phone's push address working (turning alerts off). */
export async function dropPushToken(): Promise<void> {
  await deleteToken(getMessaging(firebaseApp()))
}
