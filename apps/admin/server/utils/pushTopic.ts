// Adding a phone to (or removing it from) the "news" topic that announcements
// are sent to. Called by attendee phones when someone turns "Alerts on this
// phone" on or off (apps/pwa/app/lib/push.ts).
//
// Why on the server: browsers can't join an FCM topic themselves; only the
// Admin SDK can. Nothing about the phone is stored by us: the token only
// lives in FCM's own topic list.
//
// Phones call this from the attendee app's address, so cross-site requests are
// allowed. That's harmless: all a caller can do is get festival news. They
// send the body as text/plain, which skips the browser's extra preflight
// round trip (it matters on slow data); a preflight is still answered.
import { PUSH_TOPIC } from '#shared/push'

/** FCM registration tokens: letters, digits, '-', '_' and ':'. */
const TOKEN = /^[\w:-]{20,4096}$/

export function topicHandler(action: 'subscribe' | 'unsubscribe') {
  return defineEventHandler(async (event) => {
    if (handleCors(event, { origin: '*', methods: ['POST'], allowHeaders: ['content-type'], maxAge: '86400' })) return
    assertMethod(event, 'POST')
    let token = ''
    try {
      token = String(JSON.parse((await readRawBody(event)) || '{}').token || '')
    } catch {
      /* not JSON: refused below */
    }
    if (!TOKEN.test(token)) throw createError({ statusCode: 400, statusMessage: 'Missing or malformed token.' })

    const messaging = adminMessaging()
    const result = action === 'subscribe'
      ? await messaging.subscribeToTopic(token, PUSH_TOPIC)
      : await messaging.unsubscribeFromTopic(token, PUSH_TOPIC)
    if (result.failureCount > 0) {
      throw createError({ statusCode: 400, statusMessage: result.errors[0]?.error.message || 'FCM refused this token.' })
    }
    return { ok: true }
  })
}
