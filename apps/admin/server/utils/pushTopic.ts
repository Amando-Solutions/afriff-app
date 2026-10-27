// Adding a phone to (or removing it from) the "news" topic that announcements
// are sent to. Called by attendee phones when someone turns "Alerts on this
// phone" on or off (apps/pwa/app/lib/push.ts).
//
// Why on the server: browsers can't join an FCM topic themselves; only the
// Admin SDK can. For announcements nothing about the phone is stored by us:
// the token only lives in FCM's own topic list.
//
// Someone signed in also sends `idToken` (proof of who they are): the phone is
// then linked to their account, so invitations can reach it too
// (pushDevices.ts). Joining without one, or leaving, unlinks it. The answer
// says whether it's linked.
//
// Phones call this from the attendee app's address, so cross-site requests are
// allowed. That's harmless: all a caller can do is get festival news. They
// send the body as text/plain, which skips the browser's extra preflight
// round trip (it matters on slow data); a preflight is still answered.
import { PUSH_TOPIC } from '#shared/push'
import { linkPhone, uidFromIdToken } from './pushDevices'

/** FCM registration tokens: letters, digits, '-', '_' and ':'. */
const TOKEN = /^[\w:-]{20,4096}$/
/** Firebase ID tokens: a JWT (three base64url parts) */
const ID_TOKEN = /^[\w-]+\.[\w-]+\.[\w-]+$/

export function topicHandler(action: 'subscribe' | 'unsubscribe') {
  return defineEventHandler(async (event) => {
    if (handleCors(event, { origin: '*', methods: ['POST'], allowHeaders: ['content-type'], maxAge: '86400' })) return
    assertMethod(event, 'POST')
    let token = ''
    let idToken = ''
    try {
      const body = JSON.parse((await readRawBody(event)) || '{}')
      token = String(body.token || '')
      idToken = String(body.idToken || '')
    } catch {
      /* not JSON: refused below */
    }
    if (!TOKEN.test(token)) throw createError({ statusCode: 400, statusMessage: 'Missing or malformed token.' })
    if (!ID_TOKEN.test(idToken)) idToken = ''

    const messaging = adminMessaging()
    const result = action === 'subscribe'
      ? await messaging.subscribeToTopic(token, PUSH_TOPIC)
      : await messaging.unsubscribeFromTopic(token, PUSH_TOPIC)
    if (result.failureCount > 0) {
      throw createError({ statusCode: 400, statusMessage: result.errors[0]?.error.message || 'FCM refused this token.' })
    }
    const uid = action === 'subscribe' ? await uidFromIdToken(idToken) : null
    await linkPhone(token, uid)
    return { ok: true, linked: Boolean(uid) }
  })
}
