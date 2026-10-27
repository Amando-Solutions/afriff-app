// Invitations (console → Invitations): what an invite is, its checks, and THE
// INVITATION EMAIL itself (renderInvite): one AFRIFF design for every invite,
// built here. Brevo only delivers it (user decision 27 Oct: no Brevo templates).
//
// Shared by the console (checks while typing, the preview) and the staff app's
// server (server/invites/*, which checks again and sends), so the preview is
// exactly what's sent.
//
// What the team fills in: the event (name, day, times, venue, map link, dress
// code), optionally an artwork image link, a message and a subject. Each guest's
// email then carries their own name ("Dear Ngozi", "Your name is on the guest
// list"), the details in real text (never only in an image), "Add to calendar",
// "Get directions" and their own unsubscribe link. Invites go by email only;
// nothing here is shown in the attendee app.
import { imageLink, webLink } from '@afriff/core/utils/links'
import { escapeHtml, paragraph } from './festivalEmail'

/** invite = the invitation itself; update = a short change-of-plan email to the people a sent invite went to */
export type InviteKind = 'invite' | 'update'

export interface InviteEvent {
  name: string
  /** YYYY-MM-DD, Lagos */
  date: string
  /** HH:MM, 24-hour, Lagos */
  time: string
  /** optional, HH:MM */
  endTime: string
  venue: string
  /** optional: '' = Google Maps search for the venue */
  mapLink: string
  dressCode: string
}

export interface InviteContent {
  kind: InviteKind
  /** the inbox subject; '' = "You’re invited: <event>" (an update: "Change of plan: <event>") */
  subject: string
  /** optional artwork across the top (an https image link) */
  artworkUrl: string
  /** the letter under "Dear <first name>," (plain text, blank line = new paragraph); '' = a standard line */
  message: string
  event: InviteEvent
}

/** Who it goes to: whole groups, people picked one by one, and people left out. Each is a contact key (email, lower case). */
export interface Audience {
  groups: string[]
  people: string[]
  exclude: string[]
}

export const INVITE_LIMITS = {
  subject: 150, message: 5000, artworkUrl: 2000,
  name: 120, venue: 160, mapLink: 2000, dressCode: 80,
  groups: 50, people: 3000,
} as const

export const EMPTY_EVENT: InviteEvent = { name: '', date: '', time: '', endTime: '', venue: '', mapLink: '', dressCode: '' }

export function emptyInvite(kind: InviteKind = 'invite'): InviteContent {
  return { kind, subject: '', artworkUrl: '', message: '', event: { ...EMPTY_EVENT } }
}

// ---------- Tidying and checking ----------

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const oneLine = (v: unknown) => str(v).replace(/\s+/g, ' ').trim()
const keys = (v: unknown, max: number) =>
  [...new Set((Array.isArray(v) ? v : []).filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length <= 320))].slice(0, max)

/** Whatever arrived (a saved invite, a request body) as an invite with trimmed text. */
export function cleanInvite(raw: unknown): InviteContent {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const e = (r.event && typeof r.event === 'object' ? r.event : {}) as Record<string, unknown>
  return {
    kind: r.kind === 'update' ? 'update' : 'invite',
    subject: oneLine(r.subject),
    artworkUrl: str(r.artworkUrl).trim(),
    message: str(r.message).replace(/\r\n?/g, '\n').trim(),
    event: {
      name: oneLine(e.name),
      date: str(e.date).trim(),
      time: str(e.time).trim(),
      endTime: str(e.endTime).trim(),
      venue: oneLine(e.venue),
      mapLink: str(e.mapLink).trim(),
      dressCode: oneLine(e.dressCode),
    },
  }
}

export function cleanAudience(raw: unknown): Audience {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { groups: keys(r.groups, INVITE_LIMITS.groups), people: keys(r.people, INVITE_LIMITS.people), exclude: keys(r.exclude, INVITE_LIMITS.people) }
}

const isDay = (v: string) => /^\d{4}-\d\d-\d\d$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().startsWith(v)
const isClock = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

export type InviteField = 'subject' | 'artworkUrl' | 'message' | `event.${keyof InviteEvent}`

/** What's wrong with each field, in plain words (fields that are fine are left out). */
export function inviteProblems(raw: InviteContent): Partial<Record<InviteField, string>> {
  const c = cleanInvite(raw)
  const out: Partial<Record<InviteField, string>> = {}
  const tooLong = (v: string, max: number) => (v.length > max ? `Too long: ${v.length} characters (${max} at most).` : null)
  const set = (k: InviteField, p: string | null) => { if (p) out[k] = p }

  set('subject', tooLong(c.subject, INVITE_LIMITS.subject))
  if (c.artworkUrl) {
    if (c.artworkUrl.length > INVITE_LIMITS.artworkUrl) out.artworkUrl = 'That link is too long.'
    else if (!imageLink(c.artworkUrl) || c.artworkUrl.startsWith('/')) out.artworkUrl = /^http:\/\//i.test(c.artworkUrl) ? 'Use the https:// version of this link.' : 'Paste the full image link, starting with https://'
  }
  set('message', c.kind === 'update' && !c.message ? 'Say what has changed.' : tooLong(c.message, INVITE_LIMITS.message))

  const e = c.event
  set('event.name', !e.name ? 'Name the event, e.g. Opening Night Gala.' : tooLong(e.name, INVITE_LIMITS.name))
  set('event.date', !e.date ? 'Pick the day.' : isDay(e.date) ? null : 'Pick a real date.')
  set('event.time', !e.time ? 'When does it start?' : isClock(e.time) ? null : 'Use a time like 19:00.')
  if (e.endTime) set('event.endTime', !isClock(e.endTime) ? 'Use a time like 23:00.' : e.endTime === e.time ? 'The end time is the same as the start.' : null)
  set('event.venue', !e.venue ? 'Where is it?' : tooLong(e.venue, INVITE_LIMITS.venue))
  if (e.mapLink) set('event.mapLink', e.mapLink.length > INVITE_LIMITS.mapLink ? 'That link is too long.' : webLink(e.mapLink) && /^https:\/\//i.test(e.mapLink) ? null : 'Paste the full link, starting with https://')
  set('event.dressCode', tooLong(e.dressCode, INVITE_LIMITS.dressCode))
  return out
}

/** The subject when none is typed */
export const defaultSubject = (c: Pick<InviteContent, 'kind' | 'event'>) =>
  `${c.kind === 'update' ? 'Change of plan' : 'You’re invited'}: ${c.event.name || 'AFRIFF 2026'}`

/** The subject the email goes out with */
export const subjectOf = (c: Pick<InviteContent, 'kind' | 'subject' | 'event'>) => c.subject || defaultSubject(c)

/** The letter when no message is typed (an invitation; an update must say what changed). The event's name is the headline just above it. */
export const DEFAULT_MESSAGE = 'It would be our pleasure to have you as our guest at this year’s Africa International Film Festival. Your invitation details are below.'

// ---------- The words guests see ----------

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** 2026-11-01 → "Sunday 1 November 2026" (written out by hand: browsers and Node put commas in different places) */
export function eventDateText(day: string): string {
  if (!isDay(day)) return ''
  const d = new Date(`${day}T12:00:00Z`)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** 19:00 → "7:00 PM" */
export function clockText(t: string): string {
  if (!isClock(t)) return ''
  const [h = 0, m = 0] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** "7:00 PM" or "7:00 PM – 11:00 PM" */
export const eventTimeText = (e: Pick<InviteEvent, 'time' | 'endTime'>) =>
  [clockText(e.time), clockText(e.endTime)].filter(Boolean).join(' – ')

export const mapLinkFor = (e: Pick<InviteEvent, 'venue' | 'mapLink'>) =>
  e.mapLink || (e.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.venue}, Lagos`)}` : '')

export interface Guest {
  firstName: string
  lastName: string
}

export interface GuestLinks {
  /** the "Add to calendar" page for this invite */
  calendar: string
  /** the attendee app (also where the AFRIFF emblem in the header comes from) */
  app: string
  /** this guest's own unsubscribe link */
  unsubscribe: string
}

// ---------- The invitation email ----------
// Built the way email apps need it: tables, inline styles, one width (600 px),
// a fixed-width box for Outlook on Windows, light background (email apps that
// darken emails cope best with that), and a small <style> only for phones.
// Gmail and Outlook ignore the web font (Archivo, as in the app): they show Arial.

const C = {
  page: '#EEEFF5', card: '#FFFFFF', navy: '#060A26', navyDeep: '#0A1042', ink: '#0B1135', text: '#1B1F3B', soft: '#4A5072',
  muted: '#6B7090', line: '#E4E6EF', gold: '#D9A441', goldText: '#9A6A12', goldLight: '#E9C262', cream: '#FBF6EA', creamLine: '#EFDFB8',
  coral: '#B8432F', onNavy: '#A4AACC', onNavySoft: '#7277A1',
} as const
const SANS = `font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;`
const DISPLAY = `font-family:Archivo,'Helvetica Neue',Arial,sans-serif;`

/** One of the details: a small capital label, the main line, an optional second line. */
function detailRow(label: string, main: string, sub = '', last = false): string {
  if (!main) return ''
  return `<tr><td style="padding:16px 22px;${last ? '' : `border-bottom:1px solid ${C.creamLine};`}">
<div style="${SANS}font-size:11px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.goldText};">${label}</div>
<div style="${SANS}font-size:17px;line-height:24px;font-weight:bold;color:${C.ink};margin-top:3px;">${main}</div>
${sub ? `<div style="${SANS}font-size:14px;line-height:21px;color:${C.soft};margin-top:2px;">${sub}</div>` : ''}
</td></tr>`
}

/** A button that holds up in every email app (the colour sits on the cell, which Outlook keeps). */
function button(label: string, url: string, gold: boolean): string {
  if (!url) return ''
  return `<td class="btn" style="padding:0 10px 10px 0;" valign="top">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>
<td ${gold ? `bgcolor="${C.gold}"` : ''} style="border-radius:999px;${gold ? `background:${C.gold};` : `border:1px solid #C9CCDA;`}">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 26px;${SANS}font-size:15px;line-height:18px;font-weight:bold;color:${C.navy};text-decoration:none;border-radius:999px;">${label}</a>
</td></tr></table></td>`
}

/** The invitation (or change-of-plan update) for one guest. Everything typed is escaped: nothing typed becomes HTML. */
export function renderInvite(raw: InviteContent, guest: Guest, links: GuestLinks): string {
  const c = cleanInvite(raw)
  const e = c.event
  const update = c.kind === 'update'
  const first = guest.firstName.trim()
  const fullName = `${first} ${guest.lastName.trim()}`.trim()
  const when = eventDateText(e.date)
  const time = eventTimeText(e)
  const map = mapLinkFor(e)
  const message = c.message || (update ? '' : DEFAULT_MESSAGE)
  const paragraphs = message.split(/\n[ \t]*\n+/).map((s) => s.trim()).filter(Boolean)
  const emblem = /^https?:\/\//.test(links.app) ? `${links.app.replace(/\/$/, '')}/pwa-192x192.png` : ''
  // the grey line inbox lists show after the subject, padded so the email's own text doesn't follow it
  const preview = escapeHtml([update ? 'Change of plan' : 'You’re invited', e.name, [when, clockText(e.time)].filter(Boolean).join(', ')].filter(Boolean).join(' · '))
  const h = (s: string) => escapeHtml(s)

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${h(subjectOf(c))}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&amp;display=swap" rel="stylesheet">
<style>
body{margin:0!important;padding:0!important;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
@media only screen and (max-width:620px){
.outer{padding:12px 8px!important}
.px{padding-left:22px!important;padding-right:22px!important}
.title{font-size:28px!important;line-height:34px!important}
.btns{width:100%!important}
.btn{display:block!important;width:100%!important;padding:0 0 10px 0!important}
.btn table{width:100%!important}
.btn a{display:block!important;text-align:center!important}
.dates{display:none!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${preview}${'&#8199;&#65279;&#847; '.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="max-width:600px;background:${C.card};border-radius:20px;overflow:hidden;">

<tr><td class="px" bgcolor="${C.navy}" style="background:${C.navy};background-image:linear-gradient(135deg,${C.navyDeep} 0%,${C.navy} 60%,#04315B 100%);padding:22px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${emblem ? `<td width="44" valign="middle" style="padding-right:12px;"><img src="${h(emblem)}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border-radius:11px;"></td>` : ''}
<td valign="middle">
<div style="${SANS}font-size:20px;line-height:24px;font-weight:bold;letter-spacing:4px;color:${C.goldLight};">AFRIFF</div>
<div style="${SANS}font-size:12px;line-height:17px;color:${C.onNavy};">Africa International Film Festival</div>
</td>
<td class="dates" align="right" valign="middle" style="${SANS}font-size:12px;line-height:17px;color:${C.onNavy};white-space:nowrap;">1–7 November 2026<br><span style="color:${C.goldLight};">Lagos</span></td>
</tr></table>
</td></tr>

${c.artworkUrl ? `<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${h(c.artworkUrl)}" width="600" alt="${h(e.name)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;${SANS}font-size:18px;line-height:24px;font-weight:bold;color:${C.ink};"></td></tr>` : ''}

<tr><td class="px" style="padding:36px 40px 0;">
<div style="${SANS}font-size:12px;line-height:16px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${update ? C.coral : C.goldText};">${update ? 'Change of plan' : 'You’re invited'}</div>
<h1 class="title" style="margin:10px 0 0;${DISPLAY}font-size:32px;line-height:38px;font-weight:700;letter-spacing:-0.5px;color:${C.ink};">${h(e.name)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td width="48" height="3" bgcolor="${C.gold}" style="background:${C.gold};font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>

<tr><td class="px" style="padding:26px 40px 4px;${SANS}font-size:16px;line-height:26px;color:${C.text};">
<p style="margin:0 0 16px;">${first ? `Dear ${h(first)},` : 'Hello,'}</p>
${paragraphs.map((p) => `<p style="margin:0 0 16px;">${paragraph(p)}</p>`).join('\n')}
</td></tr>

<tr><td class="px" style="padding:8px 40px 6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.cream}" style="border-collapse:separate;background:${C.cream};border:1px solid ${C.creamLine};border-radius:14px;overflow:hidden;">
${detailRow('When', h(when), h(time))}
${detailRow('Where', h(e.venue))}
${detailRow('Dress code', h(e.dressCode))}
${detailRow('Guest', h(fullName || 'You'), update ? 'Your place on the guest list is unchanged.' : 'Your name is on the guest list.', true)}
</table>
</td></tr>

<tr><td class="px" style="padding:22px 40px 4px;">
<table class="btns" role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${button('Add to calendar', links.calendar, true)}${button('Get directions', map, false)}
</tr></table>
</td></tr>

<tr><td class="px" style="padding:16px 40px 36px;${SANS}font-size:16px;line-height:26px;color:${C.text};">
${update ? 'We look forward to seeing you.' : 'We look forward to welcoming you.'}<br><strong style="color:${C.ink};">The AFRIFF team</strong>
</td></tr>

<tr><td class="px" bgcolor="${C.navy}" style="background:${C.navy};padding:24px 40px 26px;${SANS}font-size:12px;line-height:19px;color:${C.onNavy};">
<div><strong style="color:${C.goldLight};letter-spacing:2px;">AFRIFF 2026</strong> &middot; 1–7 November &middot; Lagos</div>
${links.app ? `<div style="margin-top:4px;"><a href="${h(links.app)}" target="_blank" style="color:${C.goldLight};text-decoration:underline;">Open the AFRIFF festival app</a></div>` : ''}
<div style="margin-top:14px;padding-top:14px;border-top:1px solid #20264A;color:${C.onNavySoft};">You’re getting this invitation because you agreed to hear from AFRIFF. <a href="${h(links.unsubscribe)}" target="_blank" style="color:${C.onNavy};text-decoration:underline;">Unsubscribe</a></div>
</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`
}

// ---------- "Add to calendar" ----------

/** Lagos is UTC+1 all year (no summer time). */
const LAGOS_OFFSET_H = 1

/** Start and end as UTC Dates; no end time = 3 hours; an end before the start is the next day. */
export function eventSpan(e: Pick<InviteEvent, 'date' | 'time' | 'endTime'>): { start: Date; end: Date } | null {
  if (!isDay(e.date) || !isClock(e.time)) return null
  const at = (t: string) => new Date(Date.parse(`${e.date}T${t}:00Z`) - LAGOS_OFFSET_H * 3_600_000)
  const start = at(e.time)
  let end = isClock(e.endTime) ? at(e.endTime) : new Date(start.getTime() + 3 * 3_600_000)
  if (end <= start) end = new Date(end.getTime() + 24 * 3_600_000)
  return { start, end }
}

const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`)

/** Lines longer than 75 characters folded, as calendar files require. */
const fold = (line: string) => line.match(/.{1,74}/g)?.join('\r\n ') ?? line

/** A calendar file (.ics) for the event: opens in Apple Calendar, Outlook, Google Calendar… */
export function calendarFile(raw: InviteContent, opts: { id: string; appUrl: string; now: Date }): string {
  const c = cleanInvite(raw)
  const span = eventSpan(c.event)
  if (!span) return ''
  const details = [c.event.dressCode && `Dress code: ${c.event.dressCode}`, opts.appUrl && `AFRIFF app: ${opts.appUrl}`].filter(Boolean).join('\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AFRIFF//Invitations//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:invite-${opts.id}@afriff`,
    `DTSTAMP:${icsTime(opts.now)}`,
    `DTSTART:${icsTime(span.start)}`,
    `DTEND:${icsTime(span.end)}`,
    `SUMMARY:${icsText(c.event.name)}`,
    `LOCATION:${icsText(c.event.venue)}`,
    ...(details ? [`DESCRIPTION:${icsText(details)}`] : []),
    'END:VEVENT', 'END:VCALENDAR', '',
  ].map(fold).join('\r\n')
}

/** Google Calendar's own "add this event" page, for Android phones. */
export function googleCalendarLink(raw: InviteContent): string {
  const c = cleanInvite(raw)
  const span = eventSpan(c.event)
  if (!span) return ''
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: c.event.name,
    dates: `${icsTime(span.start)}/${icsTime(span.end)}`,
    location: c.event.venue,
    details: c.event.dressCode ? `Dress code: ${c.event.dressCode}` : '',
    ctz: 'Africa/Lagos',
  })
  return `https://calendar.google.com/calendar/render?${q}`
}
