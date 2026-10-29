// Superadmins and who may change whose role on the Team page.
// Run: npm run test:accounts (from the main folder).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { SUPERADMIN_EMAILS, isSuperadminEmail, isSuperadminLogin, needsOwnerCheck, roleLock } from '../shared/team'

const MICHAEL = 'michaelakpuofoba@gmail.com'
const OWNER = 'tithera14@gmail.com'

describe('superadmins', () => {
  it('are exactly the two owners, whatever the capitals or spaces', () => {
    assert.deepEqual([...SUPERADMIN_EMAILS].sort(), [MICHAEL, OWNER].sort())
    for (const e of [MICHAEL, OWNER, ' Tithera14@Gmail.com ', 'MICHAELAKPUOFOBA@GMAIL.COM']) assert.equal(isSuperadminEmail(e), true, e)
    for (const e of ['admin@yopmail.com', 'michaelakpuofoba@gmail.co', 'xtithera14@gmail.com', '', null, undefined, 42]) assert.equal(isSuperadminEmail(e), false, String(e))
  })
  it('need a confirmed email (anyone can make a login with an unconfirmed one)', () => {
    assert.equal(isSuperadminLogin({ email: OWNER, emailVerified: true }), true)
    assert.equal(isSuperadminLogin({ email: OWNER, emailVerified: false }), false)
    assert.equal(isSuperadminLogin({ email: 'ada@gmail.com', emailVerified: true }), false)
    assert.equal(isSuperadminLogin(null), false)
    assert.equal(needsOwnerCheck({ email: MICHAEL, emailVerified: false }), true)
    assert.equal(needsOwnerCheck({ email: MICHAEL, emailVerified: true }), false)
    assert.equal(needsOwnerCheck({ email: 'ada@gmail.com', emailVerified: false }), false)
  })
  for (const file of ['firestore.rules', 'storage.rules']) {
    it(`are the same two in ${file}`, () => {
      const rules = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8')
      const list = rules.match(/function superadminEmails\(\) \{ return \[([^\]]*)\]; \}/)
      assert.ok(list, `superadminEmails() not found in ${file}`)
      const inRules = [...list[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1])
      assert.deepEqual(inRules.sort(), [...SUPERADMIN_EMAILS].sort())
    })
  }
})

describe('changing roles on the Team page', () => {
  const admin = { id: 'a1', superadmin: false }
  const superadmin = { id: 's1', superadmin: true }
  const person = (role: string, email = 'ada@gmail.com', id = 'p1') => ({ id, email, role })

  it('admins can give any role to someone who is not an admin, including admin', () => {
    for (const role of ['pending', 'volunteer', 'editor']) assert.equal(roleLock(person(role), admin), null, role)
  })
  it("admins can't remove another admin", () => {
    assert.equal(roleLock(person('admin'), admin), 'admin')
  })
  it('superadmins can remove an admin', () => {
    assert.equal(roleLock(person('admin'), superadmin), null)
  })
  it('nobody changes a superadmin, and admins see them as an admin', () => {
    assert.equal(roleLock(person('admin', MICHAEL), superadmin), 'superadmin')
    assert.equal(roleLock(person('admin', OWNER), admin), 'superadmin')
    // even before their profile says admin
    assert.equal(roleLock(person('pending', OWNER), admin), 'superadmin')
  })
  it('nobody changes their own role', () => {
    assert.equal(roleLock(person('admin', 'ada@gmail.com', 'a1'), admin), 'self')
    assert.equal(roleLock(person('admin', MICHAEL, 's1'), superadmin), 'self')
  })
})
