// GET /api/invites/calendar?i=<invite>: an invitation's "Add to calendar" link
// (CALENDAR_LINK). Public: it only holds the event (name, time, place), never
// anything about the guest.
//   (no format)   a small page: "Google Calendar" and "Apple, Outlook and others"
//   &format=ics   the calendar file itself (.ics)
import { eventDateText, eventTimeText } from '#shared/invites'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const appUrl = String(useRuntimeConfig().public.attendeeUrl || '')
  const id = typeof q.i === 'string' ? q.i : ''
  let found: Awaited<ReturnType<ReturnType<typeof invitations>['calendar']>> = null
  try {
    found = await within(invitations().calendar(id), 10_000)
  } catch (e) {
    console.error('[invites] calendar', e)
    emailPageHeaders(event)
    setResponseStatus(event, 503)
    return emailPage(appUrl, 'Please try again in a few minutes', 'We couldn’t load this event just now.')
  }
  if (!found || !found.ics) {
    emailPageHeaders(event)
    setResponseStatus(event, 404)
    return emailPage(appUrl, 'This link doesn’t work', 'It may have been copied only in part. The date, time and place are in your invitation.')
  }
  if (q.format === 'ics') {
    setResponseHeaders(event, {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'attachment; filename="afriff-invitation.ics"',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    })
    return found.ics
  }
  emailPageHeaders(event)
  const e = found.event
  return emailPage(appUrl, `Add ${e.name} to your calendar`, [eventDateText(e.date), eventTimeText(e), e.venue].filter(Boolean).join(' · '), {
    links: [
      { label: 'Google Calendar', href: found.google },
      { label: 'Apple, Outlook and others', href: `?i=${encodeURIComponent(id)}&format=ics`, download: 'afriff-invitation.ics' },
    ],
  })
})
