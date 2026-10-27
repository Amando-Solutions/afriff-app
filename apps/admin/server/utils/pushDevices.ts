// Phones linked to attendee accounts, for pushes meant for one person (an
// invitation), as opposed to announcements, which go to every phone on the
// "news" topic (pushTopic.ts).
//
// A phone is linked when someone signed in to the attendee app has "Alerts on
// this phone" switched on: the phone sends its push address (FCM token) with
// proof of who's signed in (a Firebase ID token), and the link is kept in
//   pushTokens/{sha256 of the token} = { uid, token, at }
// one record per phone, so a phone that changes hands moves to the new account
// by itself. Logging out, turning alerts off or deleting the account removes
// it (deleting from the console: server/accounts/firestoreStore.ts). Only
// this server reads or writes it (no rule in firestore.rules, so browsers can't).
//
// Sending: one FCM message per phone (sendEach). FCM is free; each send costs
// one small database query per 30 people. Phones FCM says are gone (app
// removed, alerts blocked) are unlinked as they're found.
import { createHash } from 'node:crypto'
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore'
import type { PersonalPush } from '#shared/push'

const LINKS = 'pushTokens'

/** FCM's answers for a push address that no longer works */
const GONE = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])

const linkOf = (token: string) => adminDb().doc(`${LINKS}/${createHash('sha256').update(token).digest('hex')}`)

const chunks = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

/** Links this phone to `uid`, or (null) to nobody. */
export async function linkPhone(token: string, uid: string | null) {
  if (uid) await linkOf(token).set({ uid, token, at: FieldValue.serverTimestamp() })
  else await linkOf(token).delete()
}

/** The uid in a Firebase ID token from the attendee app, or null if it isn't a valid one. */
export async function uidFromIdToken(idToken: string): Promise<string | null> {
  if (!idToken) return null
  return adminAuth().verifyIdToken(idToken).then((t) => t.uid, () => null)
}

/** Sends `push` to every phone linked to these people. Returns whose phones it reached (at least one each). */
export async function pushToPeople(uids: string[], push: PersonalPush): Promise<Set<string>> {
  const db = adminDb()
  const phones: { uid: string; token: string; ref: DocumentReference }[] = []
  // "in" takes 30 values at a time
  for (const part of chunks([...new Set(uids.filter(Boolean))], 30)) {
    const snap = await db.collection(LINKS).where('uid', 'in', part).get()
    for (const d of snap.docs) phones.push({ uid: String(d.get('uid')), token: String(d.get('token')), ref: d.ref })
  }
  const reached = new Set<string>()
  const gone: DocumentReference[] = []
  for (const part of chunks(phones, 500)) {
    const res = await adminMessaging().sendEach(part.map((p) => ({
      token: p.token,
      webpush: { headers: { TTL: String(push.ttlSeconds), Urgency: 'high' }, data: push.data },
    })))
    res.responses.forEach((r, i) => {
      if (r.success) reached.add(part[i]!.uid)
      else if (GONE.has(r.error?.code ?? '')) gone.push(part[i]!.ref)
    })
  }
  await Promise.all(gone.map((ref) => ref.delete().catch(() => {})))
  return reached
}
