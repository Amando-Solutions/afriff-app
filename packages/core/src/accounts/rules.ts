// Attendee accounts: the rules both apps agree on. The attendee app checks
// them as people type (instant feedback, no waiting on slow data); the staff
// app's server checks them again and is the one that counts
// (apps/admin/server/accounts/logic.ts).
//
// No imports, no browser or Node APIs: safe in either app and in tests.

export const PIN_LENGTH = 4
export const CODE_LENGTH = 6

/** Wrong PINs in a row before a pause, and how long the pause lasts. */
export const TRIES_BEFORE_PAUSE = 5
export const PAUSE_MINUTES = 15
/** Wrong PINs in a row before only a new PIN (by emailed code) unlocks the account. */
export const TRIES_BEFORE_RESET = 10

/** An emailed code works for this long, for this many tries. */
export const CODE_MINUTES = 15
export const CODE_TRIES = 5
/** Codes one account can ask for in an hour. */
export const CODES_PER_HOUR = 3

/**
 * The marketing box's exact wording. Saved with each person's choice, as a
 * record of what they agreed to. Change it here and both apps follow.
 */
export const MARKETING_CONSENT = 'Yes, AFRIFF can email me festival news and updates.'

// ---------- PINs ----------

/**
 * PINs too easy to guess, refused at sign-up and on reset: every repeated
 * digit (0000, 1111…), straight runs up and down (1234, 4321…), the most
 * common PINs in published studies of leaked PINs, and years from 1950 to
 * 2030 (birth years are guessable). About 120 of the 10,000 PINs.
 */
export const COMMON_PINS: ReadonlySet<string> = (() => {
  const pins = new Set<string>()
  for (let d = 0; d <= 9; d++) pins.add(String(d).repeat(4))
  const up = '01234567890'
  const down = '98765432109'
  for (let i = 0; i + 4 <= up.length; i++) {
    pins.add(up.slice(i, i + 4))
    pins.add(down.slice(i, i + 4))
  }
  for (const p of ['1212', '1122', '1010', '2020', '1313', '6969', '1004', '2000', '2001', '2580', '0852', '1357', '2468', '1200', '1112', '1110', '0007', '4545', '5683', '0101', '2323', '1414', '1515', '1001']) pins.add(p)
  for (let y = 1950; y <= 2030; y++) pins.add(String(y))
  return pins
})()

/** What's wrong with a new PIN, in plain words, or null if it's fine. */
export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return 'Your PIN must be 4 digits.'
  if (COMMON_PINS.has(pin)) return 'That PIN is too easy to guess. Avoid repeats, runs like 1234 and years.'
  return null
}

// ---------- Email and names ----------

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

/** "michael@gmail.com" → "mi•••••@gmail.com", for "we sent a code to …" (always 5 dots: says nothing about the length) */
export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.trim().split('@')
  return `${user.slice(0, 2)}•••••@${domain}`
}
