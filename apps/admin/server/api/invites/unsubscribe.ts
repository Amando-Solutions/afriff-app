// GET / POST /api/invites/unsubscribe?i=<invite>&p=<guest>&t=<token>: the
// "Unsubscribe" link in every invitation (server/invites/links.ts). Public: no
// login, and nobody but the guest it was sent to can make a working link.
//   GET   a small page, "Stop emails from AFRIFF?", with one button (not at
//         once: some email services open every link in an email to check it).
//   POST  the button: no more invitations or festival emails for them. With an
//         app account, the same as the Profile switch (which turns them back on).
import { TEST_GUEST } from '../../invites/links'

const HOW_ELSE = 'If you have the AFRIFF app, you can also switch emails off there: Profile → Festival emails from AFRIFF.'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD' && event.method !== 'POST') {
    setResponseStatus(event, 405)
    return ''
  }
  emailPageHeaders(event)
  const appUrl = String(useRuntimeConfig().public.attendeeUrl || '')
  const q = getQuery(event)
  const [invite, guest, token] = [q.i, q.p, q.t].map((v) => (typeof v === 'string' ? v : ''))

  if (guest === TEST_GUEST) return emailPage(appUrl, 'This was a test invitation', 'Real invitations carry each guest’s own unsubscribe link here. Nothing was changed.')
  try {
    const inv = invitations()
    if (!inv.checkLink(invite, guest, token)) {
      setResponseStatus(event, 400)
      return emailPage(appUrl, 'This link doesn’t work', `It may have been copied only in part. ${HOW_ELSE}`)
    }
    if (event.method !== 'POST') {
      return emailPage(appUrl, 'Stop emails from AFRIFF?', 'You won’t get invitations or festival news from AFRIFF by email any more.', { button: 'Unsubscribe' })
    }
    await within(inv.unsubscribe(invite, guest, token), 10_000)
    return emailPage(appUrl, 'You’re unsubscribed', 'You won’t get invitations or festival emails from AFRIFF any more. Changed your mind? Sign up in the AFRIFF app and tick the box, or switch emails back on in Profile.')
  } catch (e) {
    console.error('[invites] unsubscribe', e)
    setResponseStatus(event, 503)
    return emailPage(appUrl, 'Please try again in a few minutes', `We couldn’t switch your emails off just now. ${HOW_ELSE}`)
  }
})
