// Attendee accounts: the checks and wording the attendee app and the staff
// console share. Accounts are Firebase's own email + password sign-in
// (apps/pwa/app/lib/firebase/account.ts); the attendee app checks these as
// people type, so most mistakes show at once, without waiting on slow data.
// firestore.rules check the saved record again.
//
// Each check returns what's wrong in plain words, or null when it's fine.
// No imports, no browser or Node APIs: safe in either app and in tests.

/** Firebase's own minimum is 6; we ask for a little more. */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
export const NAME_MAX = 60
export const EMAIL_MAX = 254

/**
 * The marketing box's exact wording. Saved with each person's choice, as a
 * record of what they agreed to. Change it here and both apps follow.
 * (27 Oct 2026: the PM's wording, covering invitations too; people who ticked
 * the old wording keep it on their record.)
 */
export const MARKETING_CONSENT = 'AFRIFF may email me invitations and festival updates. I can unsubscribe anytime.'

// ---------- Names ----------

/** Names as they'll be saved: trimmed, single spaces. */
export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim()

type NameLabel = 'first name' | 'last name' | 'name'

/**
 * Letters from any language (Ìfẹ́, Ọlá, Zoë), with spaces, hyphens,
 * apostrophes and full stops between them (Adé-Bàbá, O'Neil, St. John).
 */
export function nameProblem(name: string, label: NameLabel): string | null {
  const n = cleanName(name)
  if (!n) return `Type your ${label}.`
  if (n.length > NAME_MAX) return `Your ${label} is too long (${NAME_MAX} letters at most).`
  if (/\p{N}/u.test(n)) return `Your ${label} can’t have numbers in it.`
  if (!/^[\p{L}\p{M} .'’ʼ-]+$/u.test(n)) return `Use letters only in your ${label}. Spaces, hyphens and apostrophes are fine.`
  if (!/^\p{L}/u.test(n)) return `Start your ${label} with a letter.`
  return null
}

// ---------- Email ----------

/** How an email is compared: trimmed, lower case. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase()

/** What's wrong with an email, as specifically as we can say it. */
export function emailProblem(email: string): string | null {
  const e = email.trim()
  if (!e) return 'Type your email.'
  if (/\s/.test(e)) return 'An email can’t have spaces in it.'
  const parts = e.split('@')
  if (parts.length === 1) return 'An email needs an @, like name@gmail.com.'
  if (parts.length > 2) return 'An email has only one @.'
  const [local = '', domain = ''] = parts
  if (!local) return 'Add the part before the @.'
  if (!domain) return 'Add the part after the @, like gmail.com.'
  if (e.length > EMAIL_MAX || local.length > 64) return 'That email is too long.'
  if (!domain.includes('.')) return 'Finish the part after the @, like gmail.com.'
  if (/^\.|\.$|\.\./.test(local) || /^[.-]|[.-]$|\.\.|\.-|-\./.test(domain)) return 'Check the dots in your email.'
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) || !/^[\p{L}\p{N}.-]+$/u.test(domain)) return 'That email has characters emails can’t use.'
  if (!/^\p{L}{2,}$/u.test(domain.split('.').pop() ?? '')) return 'Check the end of your email, like .com.'
  return null
}

// Mail providers people in Lagos use most, to catch typos like gmial.com.
// Exact matches are never "corrected".
const MAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.fr', 'ymail.com', 'rocketmail.com',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'mail.com', 'email.com', 'proton.me', 'protonmail.com', 'zoho.com', 'gmx.com', 'afriff.com',
]
const TLD_TYPOS = new Set(['con', 'cmo', 'cpm', 'vom', 'xom', 'ocm', 'comm', 'coom', 'cim', 'om', 'cm', 'co', 'c'])

/** Fewest single-letter edits (add, remove, change, swap two neighbours) from a to b */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0]![j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, d[i - 2]![j - 2]! + 1)
      d[i]![j] = best
    }
  }
  return d[a.length]![b.length]!
}

/**
 * "Did you mean ada@gmail.com?" for a likely typo in a well-known mail
 * provider (gmial.com, yahoo.con, hotmail, gmail.co). A suggestion only:
 * people can keep what they typed.
 */
export function emailSuggestion(email: string): string | null {
  const e = email.trim()
  const at = e.lastIndexOf('@')
  if (at < 1 || /\s/.test(e)) return null
  const local = e.slice(0, at)
  const domain = e.slice(at + 1).toLowerCase()
  if (!domain || MAIL_DOMAINS.includes(domain)) return null
  // a mistyped ".com" first: "gmail", "gmail.con", "gmail.co" → gmail.com
  const dot = domain.lastIndexOf('.')
  const ending = dot === -1 ? '' : domain.slice(dot + 1)
  const typed = !ending || TLD_TYPOS.has(ending) ? `${dot === -1 ? domain : domain.slice(0, dot)}.com` : domain
  if (MAIL_DOMAINS.includes(typed)) return `${local}@${typed}`
  // then a misspelled provider with the same ending: gmial.com, yaho.co.uk.
  // Never across endings (yahoo.de is real, not a typo of yahoo.ca), and
  // never for short names like me.com, where one letter is another provider.
  let best: string | null = null
  let bestDistance = Infinity
  for (const known of MAIL_DOMAINS) {
    const name = known.slice(0, known.indexOf('.'))
    const knownEnding = known.slice(name.length)
    if (name.length < 4 || !typed.endsWith(knownEnding)) continue
    const distance = editDistance(typed.slice(0, -knownEnding.length), name)
    if (distance > 0 && distance <= (name.length >= 5 ? 2 : 1) && distance < bestDistance) {
      best = known
      bestDistance = distance
    }
  }
  return best ? `${local}@${best}` : null
}

// ---------- Passwords ----------

/** Shown under a new-password box, so people know the rules before they type */
export const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters, with an uppercase letter, a lowercase letter and a special character (like ! or #).`

/** "a", "a and b", "a, b and c" */
const listOf = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

/**
 * What's wrong with a NEW password (sign-up, staff accounts), or null:
 * long enough, with an uppercase letter, a lowercase letter and a special
 * character (anything that isn't a letter, a digit or a space).
 * Logging in only checks a password was typed: older passwords stay valid.
 */
export function passwordProblem(password: string): string | null {
  if (!password) return 'Choose a password.'
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (password.length > PASSWORD_MAX) return `That password is too long (${PASSWORD_MAX} characters at most).`
  const missing = [
    !/\p{Lu}/u.test(password) && 'an uppercase letter',
    !/\p{Ll}/u.test(password) && 'a lowercase letter',
    !/[^\p{L}\p{N}\s]/u.test(password) && 'a special character (like ! or #)',
  ].filter((m): m is string => Boolean(m))
  return missing.length ? `Add ${listOf(missing)}.` : null
}

/** The new password typed a second time */
export function confirmProblem(password: string, confirm: string): string | null {
  if (!confirm) return 'Type your password again.'
  return confirm === password ? null : 'The passwords don’t match.'
}

/** 'YYYY-MM-DD' in Lagos: the day someone signed up (Reports: sign-ups per day). */
export const lagosDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
