// POST /api/push/send (admins only, called by the console right after
// "Publish to app"): sends the push notifications that publish made due.
//
// Works from what was PUBLISHED (published/current), not the editable news
// list, so a notification never mentions something attendees can't see yet.
// Which items are due is decided by duePushes() (shared/push.ts, also used by
// the console to warn before publishing).
//
// Each item is sent at most once, ever: pushLog/{newsId} is created before
// sending, and creating fails if it already exists, so two admins publishing
// at the same moment can't both send it. A send that fails removes its log
// entry, so the next publish tries again.
//
// One message to the "news" topic reaches every phone with alerts on, however
// many there are: FCM does the fan-out, and it's free. Database cost per call:
// a few reads and writes.
import { FieldValue } from 'firebase-admin/firestore'
import type { NewsItem } from '@afriff/core/types/festival'
import { PUSH_TOPIC, duePushes, pushPayload, type PushOutcome } from '#shared/push'

/** Firestore's "already exists" error code (gRPC 6). */
const ALREADY_EXISTS = 6

export default defineEventHandler(async (event): Promise<{ results: PushOutcome[] }> => {
  const uid = await requireAdmin(event)
  const db = adminDb()

  const published = await db.doc('published/current').get()
  const json = published.get('json')
  const news: NewsItem[] = typeof json === 'string' ? (JSON.parse(json).news ?? []) : []

  const ticked = news.filter((n) => n.push === true)
  const logs = ticked.length ? await db.getAll(...ticked.map((n) => db.doc(`pushLog/${n.id}`))) : []
  const { send, skip } = duePushes(news, new Set(logs.filter((d) => d.exists).map((d) => d.id)))

  const results: PushOutcome[] = []
  for (const n of send) {
    const log = db.doc(`pushLog/${n.id}`)
    try {
      await log.create({ status: 'sending', title: n.title, by: uid, at: FieldValue.serverTimestamp() })
    } catch (e) {
      if ((e as { code?: number }).code === ALREADY_EXISTS) continue // sent by someone else just now
      throw e
    }
    const { data, ttlSeconds } = pushPayload(n)
    try {
      const messageId = await adminMessaging().send({
        topic: PUSH_TOPIC,
        webpush: { headers: { TTL: String(ttlSeconds), Urgency: 'high' }, data },
      })
      await log.update({ status: 'sent', messageId, sentAt: FieldValue.serverTimestamp() })
      results.push({ id: n.id, title: n.title, status: 'sent' })
    } catch (e) {
      await log.delete().catch(() => {})
      results.push({ id: n.id, title: n.title, status: 'failed', error: e instanceof Error ? e.message : String(e) })
    }
  }
  // Too many at once: never sent, and never sent later either.
  for (const n of skip) {
    await db.doc(`pushLog/${n.id}`).create({ status: 'skipped', title: n.title, by: uid, at: FieldValue.serverTimestamp() }).catch(() => {})
    results.push({ id: n.id, title: n.title, status: 'skipped' })
  }
  return { results }
})
