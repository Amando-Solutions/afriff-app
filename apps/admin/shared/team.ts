// Superadmins: the app's two owners. Admins can make someone an admin, but
// only a superadmin can take admin access away again.
//
// It's NOT a role in users/{uid}: a superadmin's profile says 'admin' like any
// other admin, so the console never shows "superadmin" to admins and every
// admin check keeps working. It comes from the signed-in email, and only once
// Firebase has confirmed the person owns that address (otherwise anyone could
// create a login with one of these emails). firestore.rules holds the same
// list (superadminEmails()): change both together.
export const SUPERADMIN_EMAILS: readonly string[] = ['michaelakpuofoba@gmail.com', 'tithera14@gmail.com']

export const isSuperadminEmail = (email: unknown): boolean =>
  typeof email === 'string' && SUPERADMIN_EMAILS.includes(email.trim().toLowerCase())

/** A sign-in counts as a superadmin only with a confirmed (verified) email. */
export const isSuperadminLogin = (login: { email?: string | null; emailVerified?: boolean } | null | undefined): boolean =>
  !!login?.emailVerified && isSuperadminEmail(login.email)

/** One of these emails, but not confirmed yet: the console offers to send the link. */
export const needsOwnerCheck = (login: { email?: string | null; emailVerified?: boolean } | null | undefined): boolean =>
  !!login && !login.emailVerified && isSuperadminEmail(login.email)

/**
 * Why the person looking at the Team page can't change `person`'s role, or
 * null if they can. Same rules as firestore.rules `match /users/{uid}`:
 * nobody changes their own role; superadmins can't be changed at all; admins
 * can't change (remove) another admin, only superadmins can.
 */
export function roleLock(
  person: { id: string; email?: string | null; role: string },
  viewer: { id: string; superadmin: boolean },
): 'self' | 'superadmin' | 'admin' | null {
  if (person.id === viewer.id) return 'self'
  if (isSuperadminEmail(person.email)) return 'superadmin'
  if (person.role === 'admin' && !viewer.superadmin) return 'admin'
  return null
}
