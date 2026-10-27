// Invitations: what the routes in server/api/invites/* share. The logic is in
// server/invites/.
//
// SETTINGS (staff project on Vercel, server-only, read at run time; see .env.example):
//   NUXT_BREVO_API_KEY            the same Brevo key as festival emails
//   NUXT_INVITE_FROM_ADDRESS      e.g. invites@afriff.app (its domain checked in Brevo);
//                                 empty = festival emails' NUXT_EMAIL_FROM_ADDRESS
//   NUXT_INVITE_FROM_NAME         optional, default "AFRIFF"
//   NUXT_INVITE_REPLY_TO          optional: where guests' replies go
//   NUXT_FIREBASE_SERVICE_ACCOUNT reading contacts, writing the guest list, signing links,
//                                 push notifications to guests' phones (pushDevices.ts)
//
// WHO MAY DO WHAT (checked here, on the server):
//   admins and editors  count guests, send tests, see the log
//   admins only         send, schedule, call off, fix bounced addresses
import type { H3Event } from 'h3'
import { brevoInvites } from '../invites/brevo'
import { firestoreInvites } from '../invites/firestoreStore'
import { inviteLinkSigner } from '../invites/links'
import { createInvites, type Invitations } from '../invites/logic'
import { pushToPeople } from './pushDevices'

export function inviteMailer() {
  const c = useRuntimeConfig()
  return brevoInvites({
    apiKey: String(c.brevoApiKey || ''),
    fromAddress: String(c.inviteFromAddress || c.emailFromAddress || ''),
    fromName: String(c.inviteFromName || c.emailFromName || ''),
    replyTo: String(c.inviteReplyTo || c.emailReplyTo || ''),
  })
}

let invites: Invitations | null = null

export function invitations(): Invitations {
  invites ??= createInvites({
    store: firestoreInvites(adminDb()),
    mailer: inviteMailer(),
    links: inviteLinkSigner(serverSecret()),
    pusher: { toPeople: pushToPeople },
    appUrl: String(useRuntimeConfig().public.attendeeUrl || ''),
  })
  return invites
}

/** A route the console calls, for admins and editors. The handler gets who's asking. */
export function staffRoute<T>(toDo: string, handler: (event: H3Event, who: { uid: string; role: string; name: string }) => Promise<T>) {
  return defineEventHandler(async (event) => {
    setResponseHeader(event, 'cache-control', 'no-store')
    try {
      const who = await requireRole(event, ['admin', 'editor'], toDo)
      return await handler(event, who)
    } catch (e) {
      return accountFailure(event, e)
    }
  })
}

/** The request's JSON body, or {} */
export const bodyOf = async (event: H3Event) => ((await readBody(event).catch(() => null)) ?? {}) as Record<string, unknown>
