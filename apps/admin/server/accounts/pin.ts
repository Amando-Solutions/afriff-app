// Scrambling PINs and codes, so the database never holds them readable.
//
// A 4-digit PIN has only 10,000 possibilities, so a plain one-way scramble
// ("hash") isn't enough: anyone with a copy of the database could try all
// 10,000 in seconds. So each PIN is first mixed with a SECRET KEY that lives
// only on the server (NUXT_ATTENDEE_PIN_SECRET, never in the database), then
// scrambled slowly with scrypt and a random salt. A stolen database copy is
// useless without the key.
//
// CHANGING THE SECRET KEY makes every saved PIN stop working (everyone would
// need "Forgot PIN?"). Set it once, keep it safe, never change it.
import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto'

const N = 16384 // scrypt cost: ~50 ms per PIN on a server, the usual safe setting
const KEY_LENGTH = 32

function scryptAsync(secret: Buffer, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(secret, salt, KEY_LENGTH, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

const mixed = (pin: string, pepper: string) => createHmac('sha256', pepper).update(`pin:${pin}`).digest()

/** "s1$<salt>$<scrambled>": the version prefix lets the method change later without breaking old PINs */
export async function hashPin(pin: string, pepper: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(mixed(pin, pepper), salt)
  return `s1$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifyPin(pin: string, stored: string, pepper: string): Promise<boolean> {
  const [version, salt, hash] = stored.split('$')
  if (version !== 's1' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await scryptAsync(mixed(pin, pepper), Buffer.from(salt, 'base64url'))
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** A 6-digit emailed code, scrambled with the secret key and tied to one account. */
export const codeHash = (code: string, uid: string, pepper: string) =>
  createHmac('sha256', pepper).update(`code:${uid}:${code}`).digest('base64url')

export function sameCode(code: string, uid: string, pepper: string, stored: string): boolean {
  const a = Buffer.from(codeHash(code, uid, pepper))
  const b = Buffer.from(stored)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

/** Account IDs: "att_" + 20 random characters (Firebase sign-in IDs allow up to 128) */
export const newUid = () => `att_${randomBytes(15).toString('base64url')}`

const sha = (text: string) => createHash('sha256').update(text).digest('hex')

/** attendeeEmails/{key}: one entry per email, so two accounts can't share one */
export const emailKey = (emailLower: string) => sha(`email:${emailLower}`)

/** Rate limits are kept per network without storing anyone's IP address */
export const networkKey = (ip: string) => sha(`ip:${ip}`).slice(0, 32)
