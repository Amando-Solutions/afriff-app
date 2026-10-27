// Attendee accounts: what the routes in server/api/account/* (called by
// attendee phones) and server/api/attendees/* (called by admins in the
// console) share. The account logic itself is in server/accounts/.
//
// SETTINGS (staff project on Vercel, server-only, read at run time; see .env.example):
//   NUXT_FIREBASE_SERVICE_ACCOUNT  already used by push notifications
//   NUXT_ATTENDEE_PIN_SECRET       the secret key PINs are mixed with (pin.ts).
//                                  At least 16 characters. NEVER CHANGE IT once
//                                  people have signed up: every PIN would stop working.
//   NUXT_BREVO_*                   emails and the "App subscribers" list (accounts/brevo.ts)
// Without the first two, accounts are off: the attendee app lets people in
// ("Continue for now") instead of locking them out.
import type { H3Event } from 'h3'
import { brevo } from '../accounts/brevo'
import { firestoreStore } from '../accounts/firestoreStore'
import { createAccounts, type Accounts } from '../accounts/logic'
import { networkKey } from '../accounts/pin'
import { AccountError } from '../accounts/types'

const MIN_SECRET = 16

function brevoFromConfig() {
  const c = useRuntimeConfig()
  return brevo({
    apiKey: String(c.brevoApiKey || ''),
    senderEmail: String(c.brevoSenderEmail || ''),
    senderName: String(c.brevoSenderName || 'AFRIFF'),
    listId: Number(c.brevoListId) || 0,
    doiTemplateId: Number(c.brevoDoiTemplateId) || 0,
    doiRedirectUrl: String(c.brevoDoiRedirectUrl || c.public.attendeeUrl || ''),
  })
}

/** What's set up on this server (for the attendee app and the console's Attendees page). */
export function accountsSetup() {
  const { mail, list } = brevoFromConfig()
  return {
    accounts: String(useRuntimeConfig().attendeePinSecret || '').length >= MIN_SECRET && hasServiceAccount(),
    email: mail.ready,
    list: list.ready,
    doubleOptIn: list.doubleOptIn,
  }
}

let accounts: Accounts | null = null

export function attendeeAccounts(): Accounts {
  if (accounts) return accounts
  const pepper = String(useRuntimeConfig().attendeePinSecret || '')
  if (pepper.length < MIN_SECRET || !hasServiceAccount()) {
    throw new AccountError(503, 'Accounts aren\'t switched on yet. You can still use the app.', { reason: 'not-set-up' })
  }
  const { mail, list } = brevoFromConfig()
  accounts = createAccounts({
    store: firestoreStore(adminDb()),
    pepper,
    mail,
    list,
    // `attendee: true` is what firestore.rules check (isAttendee()), so attendee
    // sign-ins can never act as staff
    token: (uid) => adminAuth().createCustomToken(uid, { attendee: true }),
    dropLogin: async (uid) => {
      await adminAuth().deleteUser(uid).catch((e: { code?: string }) => {
        if (e?.code !== 'auth/user-not-found') throw e
      })
    },
    // `npm run dev:admin` with no Brevo key: codes are printed in the terminal instead
    printCodes: import.meta.dev,
  })
  return accounts
}

/** The network a request came from, scrambled (rate limits; no IP address is stored). */
export function networkOf(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) || ''
  return ip ? networkKey(ip) : ''
}

/** The attendee signed in on the phone that sent this Firebase ID token. */
export async function attendeeUid(idToken: unknown): Promise<string> {
  const signedOut = new AccountError(401, 'Log in again, then try again.', { reason: 'signed-out' })
  if (typeof idToken !== 'string' || !idToken) throw signedOut
  const auth = adminAuth() // outside the try: "not set up" mustn't read as "signed out"
  try {
    const decoded = await auth.verifyIdToken(idToken)
    if (decoded.attendee !== true) throw signedOut
    return decoded.uid
  } catch {
    throw signedOut
  }
}

/** Any problem as JSON the apps can show: { error: { message, field?, reason?, minutes? } } */
export function accountFailure(event: H3Event, e: unknown) {
  if (e instanceof AccountError) {
    setResponseStatus(event, e.status)
    return { error: { message: e.message, ...e.extra } }
  }
  const h = e as { statusCode?: number; statusMessage?: string } | null
  if (h?.statusCode && (h.statusCode < 500 || h.statusCode === 503)) {
    setResponseStatus(event, h.statusCode)
    return { error: { message: h.statusMessage || 'Request refused.', ...(h.statusCode === 503 ? { reason: 'not-set-up' } : {}) } }
  }
  console.error('[accounts]', e)
  setResponseStatus(event, 500)
  return { error: { message: 'Something went wrong on our side. Try again in a minute.' } }
}

/**
 * A route attendee phones call. They're on a different address (the attendee
 * app), so cross-site requests are allowed; nothing here relies on cookies, so
 * that's safe. Phones send JSON as text/plain, which skips the browser's extra
 * "preflight" round trip (it matters on slow data); a preflight is still answered.
 */
export function accountRoute<T>(handler: (event: H3Event, body: Record<string, unknown>) => Promise<T>) {
  return defineEventHandler(async (event) => {
    if (handleCors(event, { origin: '*', methods: ['POST'], allowHeaders: ['content-type'], maxAge: '86400' })) return
    setResponseHeader(event, 'cache-control', 'no-store')
    try {
      assertMethod(event, 'POST')
      let body: unknown
      try {
        body = JSON.parse((await readRawBody(event)) || '{}')
      } catch {
        body = null
      }
      if (!body || typeof body !== 'object') throw new AccountError(400, 'The app sent something we couldn\'t read. Reload the app and try again.')
      return await handler(event, body as Record<string, unknown>)
    } catch (e) {
      return accountFailure(event, e)
    }
  })
}

/** A route the console calls (same address), admins only. */
export function attendeeAdminRoute<T>(toDo: string, handler: (event: H3Event) => Promise<T>) {
  return defineEventHandler(async (event) => {
    setResponseHeader(event, 'cache-control', 'no-store')
    try {
      await requireAdmin(event, toDo)
      return await handler(event)
    } catch (e) {
      return accountFailure(event, e)
    }
  })
}
