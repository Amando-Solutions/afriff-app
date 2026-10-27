// Attendee accounts and festival emails, admins' side: what the routes in
// server/api/attendees/* and server/api/emails/* share. The logic is in
// server/accounts/ and server/emails/. Attendees sign up, log in and reset
// passwords with Firebase directly from their phones; nothing here takes part
// in that.
//
// SETTINGS (staff project on Vercel, server-only, read at run time; see .env.example):
//   NUXT_FIREBASE_SERVICE_ACCOUNT  already used by push notifications; here, to
//                                  delete someone's sign-in with their account
//                                  and to read who said yes to festival emails
//   NUXT_BREVO_API_KEY, NUXT_EMAIL_FROM_ADDRESS (+ optional NUXT_EMAIL_FROM_NAME,
//   NUXT_EMAIL_REPLY_TO): festival emails (server/emails/brevo.ts)
import type { H3Event } from 'h3'
import { firestoreStore } from '../accounts/firestoreStore'
import { createAttendeeAdmin, type AttendeeAdmin } from '../accounts/logic'
import { AccountError } from '../accounts/types'
import { brevoMailer } from '../emails/brevo'
import { firestoreCampaigns } from '../emails/firestoreStore'
import { linkSigner } from '../emails/links'
import { createFestivalEmails, type FestivalEmails } from '../emails/logic'

let admin: AttendeeAdmin | null = null

export function attendeeAdmin(): AttendeeAdmin {
  admin ??= createAttendeeAdmin({
    store: firestoreStore(adminDb()),
    dropLogin: async (uid) => {
      await adminAuth().deleteUser(uid).catch((e: { code?: string }) => {
        if (e?.code !== 'auth/user-not-found') throw e
      })
    },
  })
  return admin
}

/** Brevo, from the staff app's settings. */
export function emailMailer() {
  const c = useRuntimeConfig()
  return brevoMailer({
    apiKey: String(c.brevoApiKey || ''),
    fromAddress: String(c.emailFromAddress || ''),
    fromName: String(c.emailFromName || ''),
    replyTo: String(c.emailReplyTo || ''),
  })
}

let emails: FestivalEmails | null = null

export function festivalEmails(): FestivalEmails {
  emails ??= createFestivalEmails({
    store: firestoreCampaigns(adminDb()),
    mailer: emailMailer(),
    signer: linkSigner(serverSecret()),
    appUrl: String(useRuntimeConfig().public.attendeeUrl || ''),
  })
  return emails
}

/** This staff app's own address, as the console reached it: the start of unsubscribe links. */
export const ownAddress = (event: H3Event) => getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin

/** Any problem as JSON the console can show: { error: { message, reason? } } */
export function accountFailure(event: H3Event, e: unknown) {
  if (e instanceof AccountError) {
    setResponseStatus(event, e.status)
    return { error: { message: e.message, ...e.extra } }
  }
  const h = e as { statusCode?: number; statusMessage?: string } | null
  if (h?.statusCode && (h.statusCode < 500 || h.statusCode === 503)) {
    setResponseStatus(event, h.statusCode)
    return { error: { message: h.statusMessage || 'Request refused.' } }
  }
  console.error('[admin]', e)
  setResponseStatus(event, 500)
  return { error: { message: 'Something went wrong on the server. Try again in a minute.' } }
}

/** A route the console calls (same address), admins only. The handler gets the admin's uid. */
export function adminRoute<T>(toDo: string, handler: (event: H3Event, uid: string) => Promise<T>) {
  return defineEventHandler(async (event) => {
    setResponseHeader(event, 'cache-control', 'no-store')
    try {
      const uid = await requireAdmin(event, toDo)
      return await handler(event, uid)
    } catch (e) {
      return accountFailure(event, e)
    }
  })
}
