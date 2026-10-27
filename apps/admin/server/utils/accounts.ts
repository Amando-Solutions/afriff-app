// Attendee accounts, admins' side: what the routes in server/api/attendees/*
// share (console → Attendees). The logic is in server/accounts/.
// Attendees sign up, log in and reset passwords with Firebase directly from
// their phones; nothing here takes part in that.
//
// SETTINGS (staff project on Vercel, server-only, read at run time; see .env.example):
//   NUXT_FIREBASE_SERVICE_ACCOUNT  already used by push notifications; here, to
//                                  delete someone's sign-in with their account
//   NUXT_BREVO_API_KEY, NUXT_BREVO_LIST_ID (+ optional double opt-in): "Send to Brevo"
import type { H3Event } from 'h3'
import { brevoList } from '../accounts/brevo'
import { firestoreStore } from '../accounts/firestoreStore'
import { createAttendeeAdmin, type AttendeeAdmin } from '../accounts/logic'
import { AccountError } from '../accounts/types'

function listFromConfig() {
  const c = useRuntimeConfig()
  return brevoList({
    apiKey: String(c.brevoApiKey || ''),
    listId: Number(c.brevoListId) || 0,
    doiTemplateId: Number(c.brevoDoiTemplateId) || 0,
    doiRedirectUrl: String(c.brevoDoiRedirectUrl || c.public.attendeeUrl || ''),
  })
}

/** What's set up on this server, for the console's Attendees page. */
export function attendeeSetup() {
  const list = listFromConfig()
  return { serviceAccount: hasServiceAccount(), list: list.ready, doubleOptIn: list.doubleOptIn }
}

let admin: AttendeeAdmin | null = null

export function attendeeAdmin(): AttendeeAdmin {
  admin ??= createAttendeeAdmin({
    store: firestoreStore(adminDb()),
    list: listFromConfig(),
    dropLogin: async (uid) => {
      await adminAuth().deleteUser(uid).catch((e: { code?: string }) => {
        if (e?.code !== 'auth/user-not-found') throw e
      })
    },
  })
  return admin
}

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
  console.error('[attendees]', e)
  setResponseStatus(event, 500)
  return { error: { message: 'Something went wrong on the server. Try again in a minute.' } }
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
