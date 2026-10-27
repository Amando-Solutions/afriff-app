// Each invitation's own unsubscribe link:
//   <staff app>/api/invites/unsubscribe?i=<invite id>&p=<guest>&t=<token>
// <guest> is their contact key (email, lower case) in base64url, so it works for
// guests added by hand, who have no app account. The token signs the guest and
// the invite together: a link only works for the person and the invite it was
// sent with, and nobody can make one for someone else. Same secret as festival
// emails' links (server/utils/firebaseAdmin.ts serverSecret), different purpose.
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Test emails' guest: the page says it was only a test. */
export const TEST_GUEST = 'test'

export type InviteLinkSigner = ReturnType<typeof inviteLinkSigner>

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url')

export function inviteLinkSigner(secret: string) {
  const sign = (inviteId: string, key: string) => createHmac('sha256', secret).update(`afriff-invite-unsubscribe:${inviteId}:${key}`).digest('base64url').slice(0, 24)

  return {
    url(base: string, inviteId: string, key: string) {
      if (key === TEST_GUEST) return `${base}/api/invites/unsubscribe?p=${TEST_GUEST}`
      return `${base}/api/invites/unsubscribe?i=${encodeURIComponent(inviteId)}&p=${b64(key)}&t=${sign(inviteId, key)}`
    },
    /** the guest's key when the link checks out, else null */
    check(inviteId: unknown, guest: unknown, token: unknown): string | null {
      if (typeof inviteId !== 'string' || !/^[\w-]{1,64}$/.test(inviteId) || typeof guest !== 'string' || typeof token !== 'string') return null
      if (!/^[\w-]{1,400}$/.test(guest)) return null
      const key = Buffer.from(guest, 'base64url').toString('utf8')
      if (!key || b64(key) !== guest) return null
      const want = Buffer.from(sign(inviteId, key))
      const got = Buffer.from(token)
      return want.length === got.length && timingSafeEqual(want, got) ? key : null
    },
  }
}
