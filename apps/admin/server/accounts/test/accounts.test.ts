// Attendee accounts, tested with a pretend database.
// Run: npm run test:accounts (from the main folder).
// Sign-up, log-in and password resets are Firebase's own, so what's tested
// here is the shared checks and the admins' side: deleting an account.
// Festival emails: server/emails/test/emails.test.ts.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emailProblem, lagosDay, nameProblem, passwordProblem } from '@afriff/core/accounts/rules'
import { cleanPlan, mergePlans, planFingerprint } from '@afriff/core/accounts/plans'
import { createAttendeeAdmin } from '../logic'
import { attendee, memoryStore } from './fakes'

function setup() {
  const db = memoryStore()
  const dropped: string[] = []
  const admin = createAttendeeAdmin({ store: db.store, dropLogin: async (uid) => { dropped.push(uid) } })
  return { admin, db, dropped }
}

describe('sign-up checks (shared with the app)', () => {
  it('passwords: at least 8 characters, upper and lower case, a special character', () => {
    assert.match(passwordProblem('') ?? '', /Choose a password/)
    assert.match(passwordProblem('1234567') ?? '', /at least 8/)
    assert.equal(passwordProblem('Jollof-rice'), null)
    assert.ok(passwordProblem('x'.repeat(129)))
  })
  it('emails and names', () => {
    assert.equal(emailProblem(' ada@example.com '), null)
    assert.ok(emailProblem('not-an-email'))
    assert.ok(nameProblem(' ', 'first name'))
    assert.ok(nameProblem('<b>', 'last name'))
    assert.equal(nameProblem('Ìfẹ́ Ọlá', 'first name'), null)
  })
  it('sign-up day is the Lagos date', () => {
    assert.equal(lagosDay(Date.parse('2026-10-31T23:30:00Z')), '2026-11-01')
  })
})

describe('deleting an account (admins)', () => {
  it('records, plan and login all go', async () => {
    const { admin, db, dropped } = setup()
    db.attendees.set('u1', attendee({ email: 'a@x.com', marketing: true }))
    db.plans.set('u1', { scheduled: ['s1'] })
    assert.deepEqual(await admin.remove('u1'), { login: 'deleted' })
    assert.equal(db.attendees.size + db.plans.size, 0, 'no record left, so no more festival emails')
    assert.deepEqual(dropped, ['u1'])
  })

  it('a team member keeps their login (it is their staff login too)', async () => {
    const { admin, db, dropped } = setup()
    db.attendees.set('staff1', attendee())
    db.staff.add('staff1')
    assert.deepEqual(await admin.remove('staff1'), { login: 'kept-staff' })
    assert.equal(dropped.length, 0)
    assert.equal(db.attendees.size, 0)
  })
})

describe('My Festival across phones', () => {
  it('merging keeps everything from both copies', () => {
    const phone = cleanPlan({ scheduled: ['s1', 's2'], watched: { lady: { date: '2026-11-02', rating: 4 } }, queuesChecked: ['s1'] })
    const account = cleanPlan({ scheduled: ['s2', 's9'], watched: { lady: { date: '2026-11-01', rating: 0 }, eseuseu: { date: '2026-11-03', rating: 5 } }, queuesChecked: [] })
    const merged = mergePlans(phone, account)
    assert.deepEqual([...merged.scheduled].sort(), ['s1', 's2', 's9'])
    assert.deepEqual(merged.watched.lady, { date: '2026-11-01', rating: 4 }, 'earliest date, the rating that was given')
    assert.deepEqual(merged.watched.eseuseu, { date: '2026-11-03', rating: 5 })
  })

  it('cleaning drops junk and keeps order-independent fingerprints', () => {
    const p = cleanPlan({ scheduled: ['s1', 's1', 42, 'bad id with spaces', 's2'], watched: { x: { date: 'yesterday', rating: 9 }, 'a/b': {} }, queuesChecked: 'nope' })
    assert.deepEqual(p, { scheduled: ['s1', 's2'], watched: { x: { date: '', rating: 5 } }, queuesChecked: [] })
    assert.equal(planFingerprint(cleanPlan({ scheduled: ['b', 'a'] })), planFingerprint(cleanPlan({ scheduled: ['a', 'b'] })))
  })
})
