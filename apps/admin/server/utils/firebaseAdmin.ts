// Firebase with full rights, for the staff app's server only (never shipped to
// a browser). Used to send push notifications (Google only accepts a send
// signed with the project's private service-account key, which is why sending
// lives on a server at all) and for deleting attendee accounts from the
// console (removing someone's Firebase sign-in needs this key too).
//
// THE KEY. Firebase console → Project settings → Service accounts → Generate
// new private key downloads a .json file. Paste its whole contents into the
// staff project's NUXT_FIREBASE_SERVICE_ACCOUNT variable on Vercel (base64 of
// the file works too). It's read at run time, so no rebuild is needed after
// changing it, only a redeploy. SECRET: never commit it or put it in a
// NUXT_PUBLIC_ variable. Locally, apps/admin/.env, or
// GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json.
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import type { H3Event } from 'h3'

let app: App | null = null

type ServiceAccount = Parameters<typeof cert>[0]

function serviceAccount(value: unknown): ServiceAccount | null {
  if (!value) return null
  // Nuxt turns a variable holding JSON into an object by itself
  if (typeof value === 'object') return value as ServiceAccount
  const text = String(value).trim()
  try {
    return JSON.parse(text.startsWith('{') ? text : Buffer.from(text, 'base64').toString('utf8'))
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_FIREBASE_SERVICE_ACCOUNT isn\'t a valid service-account key (paste the whole .json file).' })
  }
}

function adminApp(): App {
  if (app) return app
  const config = useRuntimeConfig()
  const key = serviceAccount(config.firebaseServiceAccount)
  if (!key && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw createError({ statusCode: 503, statusMessage: 'The staff app\'s server isn\'t set up yet: it has no NUXT_FIREBASE_SERVICE_ACCOUNT key (needed for push notifications and deleting attendee accounts).' })
  }
  const projectId = (config.public.firebase as { projectId?: string } | undefined)?.projectId || undefined
  app = getApps()[0] ?? initializeApp({ credential: key ? cert(key) : applicationDefault(), projectId })
  return app
}

export const adminDb = () => getFirestore(adminApp())
export const adminMessaging = () => getMessaging(adminApp())
export const adminAuth = () => getAuth(adminApp())

/** Whether the service-account key is there (without failing when it isn't). */
export const hasServiceAccount = () => Boolean(useRuntimeConfig().firebaseServiceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS)

/** The signed-in staff member making this request, who must be an admin. Returns their uid. */
export async function requireAdmin(event: H3Event, toDo = 'send push notifications'): Promise<string> {
  const header = getHeader(event, 'authorization') || ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!idToken) throw createError({ statusCode: 401, statusMessage: 'Sign in to the console first.' })
  const auth = getAuth(adminApp()) // outside the try: "not set up" mustn't read as "sign-in expired"
  let uid: string
  try {
    uid = (await auth.verifyIdToken(idToken)).uid
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Your sign-in has expired. Reload the console and try again.' })
  }
  const profile = await adminDb().doc(`users/${uid}`).get()
  if (profile.get('role') !== 'admin') throw createError({ statusCode: 403, statusMessage: `Only admins can ${toDo}.` })
  return uid
}
