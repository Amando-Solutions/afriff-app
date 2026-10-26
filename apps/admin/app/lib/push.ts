// Push notifications from the console (admins, on the Publish page): what the
// next publish will send, and asking the staff app's server to send it
// (server/api/push/send.post.ts). The rule for what's due is shared with the
// server (shared/push.ts), so the list shown before publishing matches what's sent.
import { collection, getDocs } from 'firebase/firestore'
import type { NewsItem } from '@afriff/core/types/festival'
import { duePushes, type PushOutcome } from '#shared/push'
import { auth, db } from './firebase'

/**
 * The ticked news items the next publish will send (and any it will skip).
 * Reads the news list and the server's log of what was already sent
 * (pushLog, admins only: needs the current firestore.rules).
 */
export async function nextPushes() {
  const [news, logs] = await Promise.all([getDocs(collection(db, 'news')), getDocs(collection(db, 'pushLog'))])
  const items = news.docs.map((d) => ({ id: d.id, ...d.data() }) as NewsItem)
  return duePushes(items, new Set(logs.docs.map((d) => d.id)))
}

/** Sends what the publish just made due. Call right after publishing. */
export async function sendDuePushes(): Promise<PushOutcome[]> {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in again to send push notifications.')
  const res = await fetch('/api/push/send', { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.statusMessage || body?.message || `The server answered ${res.status}.`)
  return (body?.results ?? []) as PushOutcome[]
}
