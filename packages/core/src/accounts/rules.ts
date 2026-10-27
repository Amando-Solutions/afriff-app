// Attendee accounts: the checks and wording the attendee app and the staff
// console share. Accounts are Firebase's own email + password sign-in
// (apps/pwa/app/lib/firebase/account.ts); the attendee app checks these as
// people type, so most mistakes show at once, without waiting on slow data.
// firestore.rules check the saved record again.
//
// No imports, no browser or Node APIs: safe in either app and in tests.

/** Firebase's own minimum is 6; we ask for a little more. */
export const PASSWORD_MIN = 8

/**
 * The marketing box's exact wording. Saved with each person's choice, as a
 * record of what they agreed to. Change it here and both apps follow.
 */
export const MARKETING_CONSENT = 'Yes, AFRIFF can email me festival news and updates.'

/** What's wrong with a new password, in plain words, or null if it's fine. */
export function passwordProblem(password: string): string | null {
  if (!password) return 'Choose a password.'
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (password.length > 128) return 'That password is too long (128 characters at most).'
  return null
}

/** How an email is compared: trimmed, lower case. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase()

export function emailProblem(email: string): string | null {
  const e = email.trim()
  if (!e) return 'Type your email.'
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'That doesn’t look like an email address.'
  return null
}

/** Names as they'll be saved: trimmed, single spaces. */
export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim()

export function nameProblem(name: string, label: 'first name' | 'last name'): string | null {
  const n = cleanName(name)
  if (!n) return `Type your ${label}.`
  if (n.length > 60) return `Your ${label} is too long (60 letters at most).`
  // eslint-disable-next-line no-control-regex
  if (/[<>{}\u0000-\u001f]/.test(n)) return `Your ${label} has characters we can't use.`
  return null
}

/** 'YYYY-MM-DD' in Lagos: the day someone signed up (Reports: sign-ups per day). */
export const lagosDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
