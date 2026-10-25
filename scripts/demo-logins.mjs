#!/usr/bin/env node
// Creates the three demo logins for the staff console (demo checklist item 2):
//   Admin (for Theo) · Editor · Door volunteer (assigned to one venue)
//
// Run from the repo root, on a machine that can reach Firebase:
//   npm run demo:logins
//   npm run demo:logins -- --venue twinwaters     (volunteer's venue; default landmark)
//   npm run demo:logins -- --no-volunteer         (if live queues aren't in the demo)
//
// You sign in with YOUR OWN admin login (asked for here, never saved). The
// script then, for each demo account:
//   1. creates the login with a fresh random password (Firebase Auth),
//   2. creates its team profile the same way the console's sign-up does
//      (role "pending", no venue: the only thing firestore.rules allow),
//   3. as you, gives it its role (and the volunteer its venue), exactly what
//      the Team page does.
// Safe to run again: an account that already exists keeps its password and
// just gets its role/venue set again.
//
// The passwords are printed ONCE at the end. Send them to Theo privately
// (not in a group chat, not in Git). Change the emails with DEMO_ADMIN_EMAIL,
// DEMO_EDITOR_EMAIL and DEMO_DOOR_EMAIL if you'd rather use real inboxes
// (needed only if someone wants "Forgot password" to work).
//
// No packages needed: plain Node 20+ (fetch). Firebase settings come from
// NUXT_PUBLIC_FIREBASE_* variables, else apps/admin/.env.

import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const args = process.argv.slice(2)
const argValue = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const withVolunteer = !args.includes('--no-volunteer')
const venue = argValue('venue') || process.env.DEMO_VENUE || 'landmark'

// ---------- Firebase settings ----------
function readEnvFile(path) {
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8').split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
  )
}
const fileEnv = readEnvFile(new URL('../apps/admin/.env', import.meta.url).pathname)
const setting = (k) => process.env[k] || fileEnv[k] || ''
const API_KEY = setting('NUXT_PUBLIC_FIREBASE_API_KEY')
const PROJECT = setting('NUXT_PUBLIC_FIREBASE_PROJECT_ID')
if (!API_KEY || !PROJECT) {
  console.error('Missing Firebase settings: set NUXT_PUBLIC_FIREBASE_API_KEY and NUXT_PUBLIC_FIREBASE_PROJECT_ID, or create apps/admin/.env.')
  process.exit(1)
}
const AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts'
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

const ACCOUNTS = [
  { label: 'Admin (Theo)', name: 'Theo (demo admin)', email: process.env.DEMO_ADMIN_EMAIL || 'demo.admin@afriff-demo.test', role: 'admin', venue: null },
  { label: 'Editor', name: 'Demo editor', email: process.env.DEMO_EDITOR_EMAIL || 'demo.editor@afriff-demo.test', role: 'editor', venue: null },
  ...(withVolunteer
    ? [{ label: 'Door volunteer', name: 'Demo door volunteer', email: process.env.DEMO_DOOR_EMAIL || 'demo.door@afriff-demo.test', role: 'volunteer', venue }]
    : []),
]

// ---------- small helpers ----------
async function call(url, { method = 'POST', body, token } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    const err = new Error(json.error?.message || `${res.status} ${res.statusText}`)
    err.status = res.status
    err.code = json.error?.message || json.error?.status
    throw err
  }
  return json
}
const signIn = (email, password) => call(`${AUTH}:signInWithPassword?key=${API_KEY}`, { body: { email, password, returnSecureToken: true } })
const signUp = (email, password, displayName) => call(`${AUTH}:signUp?key=${API_KEY}`, { body: { email, password, displayName, returnSecureToken: true } })
const lookup = (token) => call(`${AUTH}:lookup?key=${API_KEY}`, { body: { idToken: token } })

const str = (v) => (v == null ? { nullValue: null } : { stringValue: String(v) })
const fromFields = (doc) => Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, v.stringValue ?? v.nullValue ?? v.timestampValue ?? null]))

async function readDoc(path, token) {
  try {
    return fromFields(await call(`${DB}/${path}`, { method: 'GET', token }))
  } catch (e) {
    if (e.status === 404) return null
    throw e
  }
}

// a password that's easy to read out and type on a phone: xxxx-xxxx-xxxx
function newPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(12)
  const chars = [...bytes].map((b) => abc[b % abc.length]).join('')
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) rl._writeToOutput = (s) => { if (s.startsWith(question)) process.stdout.write(question) }
    rl.question(question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}

// ---------- run ----------
console.log(`\nAFRIFF demo logins · Firebase project "${PROJECT}"`)
console.log(`Will set up: ${ACCOUNTS.map((a) => a.label + (a.venue ? ` at ${a.venue}` : '')).join(', ')}\n`)

const adminEmail = process.env.ADMIN_EMAIL || await ask('Your admin email: ')
const adminPassword = process.env.ADMIN_PASSWORD || await ask('Your admin password: ', { hidden: true })

let admin
try {
  admin = await signIn(adminEmail, adminPassword)
} catch (e) {
  console.error(`\nCouldn't sign you in (${e.code || e.message}). Check the email and password you use for the console.`)
  process.exit(1)
}
const me = await readDoc(`users/${admin.localId}`, admin.idToken)
if (me?.role !== 'admin') {
  console.error(`\n${adminEmail} isn't an admin on the Team page (role: ${me?.role || 'none'}). Only admins can give roles.`)
  process.exit(1)
}

if (withVolunteer) {
  const v = await readDoc(`venues/${venue}`)
  if (!v) {
    console.error(`\nNo venue with the ID "${venue}" in the database. Use one of the venue IDs from the console (e.g. landmark, twinwaters, palms).`)
    process.exit(1)
  }
  console.log(`Volunteer venue: ${v.name || venue}`)
}

const results = []
for (const acc of ACCOUNTS) {
  process.stdout.write(`\n${acc.label} (${acc.email}): `)
  let uid
  let password = newPassword()
  let created = false
  try {
    const u = await signUp(acc.email, password, acc.name)
    uid = u.localId
    created = true
    // team profile, as the console's sign-up page makes it
    await call(`${DB}/users?documentId=${uid}`, {
      token: u.idToken,
      body: { fields: { email: str(acc.email), name: str(acc.name), role: str('pending'), venue: str(null), createdAt: { timestampValue: new Date().toISOString() } } },
    })
    process.stdout.write('login created · ')
  } catch (e) {
    if (e.code !== 'EMAIL_EXISTS') throw e
    password = null
    process.stdout.write('already exists, password unchanged · ')
  }

  if (!uid) {
    // find the existing account's profile through the admin's view of users
    const list = await call(`${DB}:runQuery`, {
      token: admin.idToken,
      body: { structuredQuery: { from: [{ collectionId: 'users' }], where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: str(acc.email) } }, limit: 1 } },
    })
    const found = list.find((r) => r.document)
    if (!found) {
      console.log(`\n  It has a login but no team profile. Sign in once at the console with ${acc.email} (it offers to create the profile), then run this again.`)
      results.push({ ...acc, password: null, ok: false })
      continue
    }
    uid = found.document.name.split('/').pop()
  }

  // role (and venue) as the admin, like the Team page
  await call(`${DB}/users/${uid}?updateMask.fieldPaths=role&updateMask.fieldPaths=venue`, {
    method: 'PATCH',
    token: admin.idToken,
    body: { fields: { role: str(acc.role), venue: str(acc.venue) } },
  })
  console.log(`role: ${acc.role}${acc.venue ? ` · venue: ${acc.venue}` : ''}`)
  results.push({ ...acc, password, created, ok: true })
}

// quick check that each new login works
for (const r of results.filter((x) => x.password)) {
  const t = await signIn(r.email, r.password)
  const info = await lookup(t.idToken)
  if (!info.users?.length) throw new Error(`Couldn't sign in as ${r.email} after creating it`)
}

console.log('\n──────────────── Send these to Theo privately ────────────────')
for (const r of results) {
  console.log(`${r.label.padEnd(16)} ${r.email.padEnd(32)} ${r.password || '(existing account: password unchanged)'}`)
}
console.log('──────────────────────────────────────────────────────────────')
console.log('Sign in at the staff app (/admin; the volunteer lands on /door).')
console.log('These passwords are not saved anywhere. Run again only for new accounts.\n')
