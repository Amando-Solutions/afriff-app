// Push notifications for announcements (news items).
//
// Shared by the console (it lists what a publish will send, before the admin
// presses the button) and the staff app's server (server/api/push/send.post.ts,
// which decides for real and sends), so both always agree.
//
// The rule: a news item ticked "Send as a push notification" is sent ONCE, the
// first time it's published. Editing and publishing it again never re-sends it
// (the server remembers what it sent in pushLog/{newsId}). An item whose banner
// end time ("until") has passed isn't sent at all.
import type { NewsItem } from '@afriff/core/types/festival'
import { clockText, defaultSubject, eventDateText, eventSpan, type InviteContent } from './invites'

/** The FCM topic every phone with alerts on is subscribed to. */
export const PUSH_TOPIC = 'news'

/**
 * At most this many notifications per publish, newest first. Any more are
 * skipped for good (logged as skipped, never sent later), so a slip such as
 * ticking the box on a pile of old items can't flood attendees' phones.
 */
export const MAX_PUSHES_PER_PUBLISH = 3

/** Phones that were offline longer than this don't get the notification late. */
const MAX_TTL_SECONDS = 24 * 60 * 60

type PushableNews = Pick<NewsItem, 'id'> & Partial<Pick<NewsItem, 'title' | 'body' | 'time' | 'until' | 'push'>>

/** Which ticked items a publish sends now, and which it skips for good. */
export function duePushes<T extends PushableNews>(news: readonly T[], alreadyLogged: ReadonlySet<string>, now = Date.now()) {
  const due = news
    .filter((n) => n.push === true && !alreadyLogged.has(n.id) && !expired(n, now))
    .sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')))
  return { send: due.slice(0, MAX_PUSHES_PER_PUBLISH), skip: due.slice(MAX_PUSHES_PER_PUBLISH) }
}

const expired = (n: PushableNews, now: number) => Boolean(n.until) && Date.parse(String(n.until)) <= now

const clip = (s: unknown, max: number) => {
  const text = String(s ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/**
 * What the phone shows. Sent as data only: the attendee app's service worker
 * (apps/pwa/public/push-sw.js) builds the notification from these strings.
 * Tapping it opens News, where the full message and its "View" link are.
 */
export function pushPayload(n: PushableNews, now = Date.now()) {
  const untilSeconds = n.until ? Math.floor((Date.parse(String(n.until)) - now) / 1000) : MAX_TTL_SECONDS
  return {
    data: {
      title: clip(n.title, 90) || 'AFRIFF',
      body: clip(n.body, 180),
      url: '/news',
      tag: `news-${n.id}`,
    },
    ttlSeconds: Math.max(60, Math.min(MAX_TTL_SECONDS, untilSeconds)),
  }
}

// ---------- Personal pushes: invitations ----------
//
// An invitation (console → Invitations) also reaches the invited person's own
// phones: those where they're signed in to the attendee app with "Alerts on
// this phone" switched on (server/utils/pushDevices.ts). Sent with the email,
// to the same people; the email has the details, the push says to look there.

/** A notification for some people's own phones. */
export interface PersonalPush {
  data: { title: string; body: string; url: string; tag: string }
  ttlSeconds: number
}

/** Phones offline longer than this don't get an invitation's push late (the email still has it). */
const INVITE_TTL_SECONDS = 3 * 24 * 60 * 60

/** "You're invited: Opening Night Gala" / "Sunday 1 November 2026, 7:00 PM · Filmhouse Landmark. Your invitation is in your email." */
export function invitePush(id: string, c: Pick<InviteContent, 'kind' | 'message' | 'event'>, now = Date.now()): PersonalPush {
  const e = c.event
  const update = c.kind === 'update'
  const when = [eventDateText(e.date), clockText(e.time)].filter(Boolean).join(', ')
  const details = [when, clip(e.venue, 80)].filter(Boolean).join(' · ')
  const body = update
    ? `${clip(c.message, 150)} The details are in your email.`
    : `${details ? `${details}. ` : ''}Your invitation is in your email.`
  const span = eventSpan(e)
  const untilEnd = span ? Math.floor((span.end.getTime() - now) / 1000) : INVITE_TTL_SECONDS
  return {
    data: {
      title: clip(defaultSubject(c), 90),
      body: clip(body, 200),
      url: '/',
      tag: `invite-${id}`,
    },
    ttlSeconds: Math.max(60, Math.min(INVITE_TTL_SECONDS, untilEnd)),
  }
}

/** One line per item in the console's report after a publish. */
export interface PushOutcome {
  id: string
  title: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}
