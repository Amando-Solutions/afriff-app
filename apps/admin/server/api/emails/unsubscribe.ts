// GET / POST /api/emails/unsubscribe?u=<uid>&t=<token>: the "Unsubscribe" link
// at the bottom of every festival email (server/emails/links.ts). Public: no
// login, and nobody but the person it was sent to can make a working link.
//   GET   a small page, "Stop festival emails from AFRIFF?", with one button.
//         Not switched off straight away: some email services open every link
//         in an email to check it, which would unsubscribe people by itself.
//   POST  the button: their festival emails go off, as with the app's switch
//         (Profile → Festival emails from AFRIFF), which turns them on again.
// The test email's link, or a link that doesn't check out, explains how to
// switch emails off in the app instead.
import { TEST_UID } from '../../emails/links'

// the page itself: server/utils/emailPage.ts
const page = (appUrl: string, title: string, text: string, button = '') => emailPage(appUrl, title, text, { button })

const IN_THE_APP = 'You can switch festival emails off in the AFRIFF app: Profile → Festival emails from AFRIFF.'

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD' && event.method !== 'POST') {
    setResponseStatus(event, 405)
    return ''
  }
  emailPageHeaders(event)
  const appUrl = String(useRuntimeConfig().public.attendeeUrl || '')
  const q = getQuery(event)
  const uid = typeof q.u === 'string' ? q.u : ''
  const token = typeof q.t === 'string' ? q.t : ''

  if (uid === TEST_UID) return page(appUrl, 'This was a test email', `Real festival emails carry each person's own unsubscribe link here. Nothing was changed.`)
  const broken = () => {
    setResponseStatus(event, 400)
    return page(appUrl, 'This link doesn\'t work', `It may have been copied only in part. ${IN_THE_APP}`)
  }
  const later = (e: unknown) => {
    console.error('[emails] unsubscribe', e)
    setResponseStatus(event, 503)
    return page(appUrl, 'Please try again in a few minutes', `We couldn't switch your emails off just now. ${IN_THE_APP}`)
  }

  try {
    const emails = festivalEmails()
    if (!emails.isLink(uid, token)) return broken()
    if (event.method !== 'POST') {
      return page(appUrl, 'Stop festival emails from AFRIFF?', 'You won\'t get festival news and updates by email any more. Your account and your festival plan stay as they are.', 'Unsubscribe')
    }
    await within(emails.unsubscribe(uid, token), 10_000)
    return page(appUrl, 'You\'re unsubscribed', 'You won\'t get festival emails from AFRIFF any more. Changed your mind? Switch them back on in the AFRIFF app: Profile → Festival emails from AFRIFF.')
  } catch (e) {
    return later(e)
  }
})
