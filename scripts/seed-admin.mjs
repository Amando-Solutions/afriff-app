#!/usr/bin/env node
// Seeds one admin login for the staff console:
//   name "admin" · admin@yopmail.com · password @Password123 · role admin
//
// Run from the repo root, on a machine that can reach Firebase:
//   npm run seed:admin
// Change the account with SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD and
// SEED_ADMIN_NAME.
//
// firestore.rules only let an existing admin give roles. The script:
//   1. creates the login (Firebase Auth),
//   2. creates its team profile the same way the console's sign-up does
//      (role "pending", no venue: the only thing firestore.rules allow),
//   3. asks for YOUR OWN admin login (never saved; or ADMIN_EMAIL /
//      ADMIN_PASSWORD) and, as you, makes it an admin, exactly what the Team
//      page does.
// No admin login? Stop at the prompt and set the role by hand in
// Firebase console → Firestore → users (the script prints which profile).
// Safe to run again: an existing account is signed in with the same password
// and just gets its admin role set again.
//
// No packages needed: plain Node 20+ (fetch). Firebase settings come from
// NUXT_PUBLIC_FIREBASE_* variables, else apps/admin/.env.

import { existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const ACCOUNT = {
  name: process.env.SEED_ADMIN_NAME || 'admin',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@yopmail.com',
  password: process.env.SEED_ADMIN_PASSWORD || '@Password123',
}

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

async function existingAdminToken() {
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
  return admin.idToken
}

// ---------- run ----------
console.log(`\nAFRIFF seed admin · Firebase project "${PROJECT}"`)
console.log(`Will set up: ${ACCOUNT.name} (${ACCOUNT.email}) as admin\n`)

let user
try {
  user = await signUp(ACCOUNT.email, ACCOUNT.password, ACCOUNT.name)
  console.log('· login created')
} catch (e) {
  if (e.code !== 'EMAIL_EXISTS') throw e
  try {
    user = await signIn(ACCOUNT.email, ACCOUNT.password)
  } catch {
    console.error(`This login already exists with a different password. Reset it with "Forgot password" on the console (or delete it in Firebase → Authentication), then run this again.`)
    process.exit(1)
  }
  console.log('· login already exists')
}

const profilePath = `users/${user.localId}`
const createProfile = (role) => call(`${DB}/users?documentId=${user.localId}`, {
  token: user.idToken,
  body: { fields: { email: str(ACCOUNT.email), name: str(ACCOUNT.name), role: str(role), venue: str(null), createdAt: { timestampValue: new Date().toISOString() } } },
})
const makeAdmin = (token) => call(`${DB}/${profilePath}?updateMask.fieldPaths=role&updateMask.fieldPaths=venue`, {
  method: 'PATCH',
  token,
  body: { fields: { role: str('admin'), venue: str(null) } },
})

const profile = await readDoc(profilePath, user.idToken)
if (profile?.role === 'admin') {
  console.log('· already an admin')
} else {
  if (!profile) {
    await createProfile('pending')
    console.log('· profile created')
  }
  console.log(`\nAn existing admin has to give the role. (No admin login? Press Ctrl+C and, in Firebase console → Firestore → users → ${user.localId}, change role to "admin".)`)
  await makeAdmin(await existingAdminToken())
  console.log('· role given by your admin login')
}

const check = await readDoc(profilePath, user.idToken)
if (check?.role !== 'admin') throw new Error(`Role didn't save (it reads "${check?.role}")`)
console.log(`\nDone: ${ACCOUNT.email} is an admin. Sign in at the staff app (/admin).\n`)
