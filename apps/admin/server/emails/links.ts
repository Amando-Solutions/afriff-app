// Each festival email's own unsubscribe link:
//   <staff app>/api/emails/unsubscribe?u=<uid>&t=<token>
// The token is a signature of the uid, so a link only works for the person it
// was sent to and nobody can make one for someone else. The secret comes from
// the server's Firebase service-account key (server/utils/emails.ts), so
// there's no extra setting to manage.
import { createHmac, timingSafeEqual } from 'node:crypto'

/** The test email's link: opens a page saying it was only a test. */
export const TEST_UID = 'test'

export type LinkSigner = ReturnType<typeof linkSigner>

export function linkSigner(secret: string) {
  const sign = (uid: string) => createHmac('sha256', secret).update(`afriff-unsubscribe:${uid}`).digest('base64url').slice(0, 24)

  return {
    url(base: string, uid: string) {
      return uid === TEST_UID
        ? `${base}/api/emails/unsubscribe?u=${TEST_UID}`
        : `${base}/api/emails/unsubscribe?u=${encodeURIComponent(uid)}&t=${sign(uid)}`
    },
    /** true when `token` is the one sent to `uid` */
    check(uid: unknown, token: unknown): boolean {
      if (typeof uid !== 'string' || !/^[\w-]{10,128}$/.test(uid) || typeof token !== 'string') return false
      const want = Buffer.from(sign(uid))
      const got = Buffer.from(token)
      return want.length === got.length && timingSafeEqual(want, got)
    },
  }
}
