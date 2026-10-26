// "Alerts on this phone": push notifications for announcements.
//
// When an admin publishes a news item ticked "Send as a push notification",
// the staff app's server sends it once to the FCM topic "news"
// (apps/admin/server/api/push/send.post.ts). This file puts this phone on that
// topic, or takes it off:
//   on:  ask the phone's permission (from the tap itself: browsers only ask in
//        answer to one) → get this phone's push address from FCM
//        (lib/firebase/messaging.ts) → the staff app's server adds it to the
//        topic (POST <adminUrl>/api/push/subscribe).
//   off: remove it from the topic and delete the address.
// The phone's service worker shows what arrives (public/push-sw.js).
//
// Opt-in, never automatic. Kept on this phone (localStorage): we store no
// list of phones; the address only lives in FCM's topic.
//
// iPhone: alerts only work in the app added to the Home Screen (iOS 16.4+),
// so in Safari the switch is replaced by how to add it (AlertsSwitch.vue).
// Not in `npm run dev` (no service worker there): use build + preview.
import { reactive } from 'vue'

const KEY = 'afriff-push'
/** Re-join the topic now and then anyway, in case the phone dropped off it. */
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000

interface Saved { token: string; at: number }

const store = {
  get: (): Saved | null => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null')
      return v && typeof v.token === 'string' ? v : null
    } catch {
      return null
    }
  },
  set: (v: Saved | null) => {
    try {
      if (v) localStorage.setItem(KEY, JSON.stringify(v))
      else localStorage.removeItem(KEY)
    } catch {
      /* storage blocked: alerts still work, the switch just won't remember */
    }
  },
}

let config = { adminUrl: '', vapidKey: '' }

export const pushState = reactive({
  on: false,
  permission: 'default' as NotificationPermission,
  busy: false,
  error: '',
})

/** Called once as the app starts (plugins/push.client.ts), with the public runtime config. */
export function configurePush(pub: { adminUrl?: unknown; firebaseVapidKey?: unknown }) {
  config = { adminUrl: String(pub.adminUrl || '').replace(/\/+$/, ''), vapidKey: String(pub.firebaseVapidKey || '') }
  pushState.on = Boolean(store.get())
  if (browserCanPush()) pushState.permission = Notification.permission
}

/** Set up on this deploy (Web Push key + staff app address), and not the dev server. */
export const pushConfigured = () => Boolean(config.adminUrl && config.vapidKey) && !import.meta.dev

export const browserCanPush = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function tellServer(action: 'subscribe' | 'unsubscribe', token: string) {
  // text/plain: no extra preflight round trip on slow data (see the server side)
  const res = await fetch(`${config.adminUrl}/api/push/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) throw new Error(`the alerts service answered ${res.status}`)
}

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** From the switch's tap: ask permission, then join the alerts topic. */
export async function turnOnAlerts() {
  pushState.error = ''
  const permission = await Notification.requestPermission()
  pushState.permission = permission
  if (permission !== 'granted') return
  pushState.busy = true
  try {
    const { pushToken } = await import('./firebase/messaging')
    const token = await pushToken(config.vapidKey)
    await tellServer('subscribe', token)
    store.set({ token, at: Date.now() })
    pushState.on = true
  } catch (e) {
    pushState.error = navigator.onLine === false
      ? 'You\'re offline. Turn alerts on when you have a connection.'
      : `Couldn't turn alerts on (${reason(e)}). Try again in a moment.`
  } finally {
    pushState.busy = false
  }
}

/** Off at once on this phone; leaving the topic is best effort (the deleted address stops working anyway). */
export async function turnOffAlerts() {
  const saved = store.get()
  store.set(null)
  Object.assign(pushState, { on: false, error: '' })
  if (!saved) return
  pushState.busy = true
  try {
    await tellServer('unsubscribe', saved.token).catch(() => {})
    const { dropPushToken } = await import('./firebase/messaging')
    await dropPushToken()
  } catch {
    /* offline or already gone: nothing more to do */
  } finally {
    pushState.busy = false
  }
}

/**
 * On each start, if alerts are on: notice if they were blocked in the phone's
 * settings, and re-join the topic if FCM renewed this phone's address (or
 * weekly anyway). Quiet: any failure is retried on the next start.
 */
export async function refreshAlerts() {
  const saved = store.get()
  if (!saved || !pushConfigured() || !browserCanPush()) return
  pushState.permission = Notification.permission
  if (Notification.permission !== 'granted') {
    store.set(null)
    pushState.on = false
    return
  }
  if (navigator.onLine === false) return
  try {
    const { pushToken } = await import('./firebase/messaging')
    const token = await pushToken(config.vapidKey)
    if (token === saved.token && Date.now() - saved.at < REFRESH_MS) return
    await tellServer('subscribe', token)
    store.set({ token, at: Date.now() })
  } catch {
    /* next start tries again */
  }
}
