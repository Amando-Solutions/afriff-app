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
import { escapeHtml } from '#shared/festivalEmail'
import { TEST_UID } from '../../emails/links'

function page(appUrl: string, title: string, text: string, button = '') {
  const app = appUrl ? `<p><a href="${escapeHtml(appUrl)}">Open the AFRIFF app</a></p>` : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · AFRIFF</title>
<style>
body{margin:0;background:#060A26;color:#F3F3FF;font:16px/1.6 Arial,Helvetica,sans-serif}
main{max-width:30rem;margin:0 auto;padding:3rem 1.25rem}
.brand{font-weight:bold;letter-spacing:3px;color:#E9C262;font-size:1.25rem;margin:0 0 2rem}
h1{font-size:1.5rem;line-height:1.3;margin:0 0 .75rem}
p{color:#A4AACC;margin:0 0 1.25rem}
a{color:#E9C262}
button{font:inherit;font-weight:bold;background:#D9A441;color:#060A26;border:0;border-radius:999px;padding:.8rem 1.5rem;cursor:pointer}
</style>
</head>
<body><main>
<p class="brand">AFRIFF</p>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(text)}</p>
${button ? `<form method="post"><p><button type="submit">${escapeHtml(button)}</button></p></form>` : ''}
${app}
</main></body>
</html>`
}

const IN_THE_APP = 'You can switch festival emails off in the AFRIFF app: Profile → Festival emails from AFRIFF.'

/** the database not answering shouldn't leave someone staring at a blank page */
const within = <T>(work: Promise<T>, ms: number) =>
  Promise.race([work, new Promise<never>((_, fail) => setTimeout(() => fail(new Error(`no answer in ${ms / 1000} s`)), ms))])

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD' && event.method !== 'POST') {
    setResponseStatus(event, 405)
    return ''
  }
  setResponseHeaders(event, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  })
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
