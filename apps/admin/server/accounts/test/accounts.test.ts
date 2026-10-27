// Attendee accounts, tested with a pretend database and Brevo list.
// Run: npm run test:accounts (from the main folder).
// Sign-up, log-in and password resets are Firebase's own, so what's tested
// here is the shared checks and the admins' side: deleting an account and
// "Send to Brevo".
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emailProblem, lagosDay, nameProblem, passwordProblem } from '@afriff/core/accounts/rules'
import { cleanPlan, mergePlans, planFingerprint } from '@afriff/core/accounts/plans'
import { createAttendeeAdmin } from '../logic'
import { AccountError } from '../types'
import { attendee, fakeList, memoryStore } from './fakes'

function setup(opts: { listReady?: boolean; doubleOptIn?: boolean } = {}) {
  const db = memoryStore()
  const brevo = fakeList(opts.listReady ?? true, opts.doubleOptIn ?? false)
  const dropped: string[] = []
  const admin = createAttendeeAdmin({ store: db.store, list: brevo.list, dropLogin: async (uid) => { dropped.push(uid) } })
  return { admin, db, brevo, dropped }
}

describe('sign-up checks (shared with the app)', () => {
  it('passwords: at least 8 characters', () => {
    assert.match(passwordProblem('') ?? '', /Choose a password/)
    assert.match(passwordProblem('1234567') ?? '', /at least 8/)
    assert.equal(passwordProblem('festival2026'), null)
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

describe('Send to Brevo', () => {
  it('adds people who ticked the box, takes off people who unticked it', async () => {
    const { admin, db, brevo } = setup()
    db.attendees.set('a', attendee({ email: 'a@x.com', marketing: true, brevo: 'pending' }))
    db.attendees.set('b', attendee({ email: 'b@x.com', marketing: false, brevo: 'pending' }))
    db.attendees.set('c', attendee({ email: 'c@x.com', marketing: false, brevo: 'off' }))
    brevo.members.add('b@x.com')
    assert.deepEqual(await admin.sendToBrevo(), { done: 2, failed: 0, more: false })
    assert.deepEqual([...brevo.members], ['a@x.com'])
    assert.equal(db.attendees.get('a')!.brevo, 'sent')
    assert.equal(db.attendees.get('b')!.brevo, 'removed')
    assert.equal(db.attendees.get('c')!.brevo, 'off', 'people who never ticked are never sent')
  })

  it('double opt-in: waits for the person to confirm', async () => {
    const { admin, db } = setup({ doubleOptIn: true })
    db.attendees.set('a', attendee({ marketing: true, brevo: 'pending' }))
    await admin.sendToBrevo()
    assert.equal(db.attendees.get('a')!.brevo, 'confirm-sent')
  })

  it('Brevo down: the problem is saved and the next press retries', async () => {
    const { admin, db, brevo } = setup()
    db.attendees.set('a', attendee({ marketing: true, brevo: 'pending' }))
    brevo.setDown(true)
    assert.deepEqual(await admin.sendToBrevo(), { done: 0, failed: 1, more: false })
    assert.equal(db.attendees.get('a')!.brevo, 'failed')
    assert.match(db.attendees.get('a')!.brevoError, /503/)
    brevo.setDown(false)
    assert.equal((await admin.sendToBrevo()).done, 1)
    assert.equal(db.attendees.get('a')!.brevo, 'sent')
  })

  it('accounts deleted in the app: their Brevo contact is deleted too', async () => {
    const { admin, db, brevo } = setup()
    brevo.members.add('gone@x.com')
    db.removals.set('g', 'gone@x.com')
    await admin.sendToBrevo()
    assert.deepEqual(brevo.forgotten, ['gone@x.com'])
    assert.equal(db.removals.size, 0)
  })

  it('more than a batch: says to press again', async () => {
    const { admin, db } = setup()
    for (let i = 0; i < 3; i++) db.attendees.set(`p${i}`, attendee({ email: `p${i}@x.com`, marketing: true, brevo: 'pending' }))
    assert.equal((await admin.sendToBrevo(2)).more, true)
    assert.equal((await admin.sendToBrevo(2)).more, false)
  })

  it('not set up: says so', async () => {
    const { admin } = setup({ listReady: false })
    await assert.rejects(admin.sendToBrevo(), (e: unknown) => e instanceof AccountError && e.status === 503)
  })
})

describe('deleting an account (admins)', () => {
  it('records, plan, Brevo contact and login all go', async () => {
    const { admin, db, brevo, dropped } = setup()
    db.attendees.set('u1', attendee({ email: 'a@x.com', marketing: true, brevo: 'sent' }))
    db.plans.set('u1', { scheduled: ['s1'] })
    brevo.members.add('a@x.com')
    assert.deepEqual(await admin.remove('u1'), { brevo: 'deleted', login: 'deleted' })
    assert.equal(db.attendees.size + db.plans.size, 0)
    assert.deepEqual(brevo.forgotten, ['a@x.com'])
    assert.deepEqual(dropped, ['u1'])
  })

  it('a team member keeps their login (it is their staff login too)', async () => {
    const { admin, db, dropped } = setup()
    db.attendees.set('staff1', attendee())
    db.staff.add('staff1')
    assert.deepEqual(await admin.remove('staff1'), { brevo: 'not-needed', login: 'kept-staff' })
    assert.equal(dropped.length, 0)
    assert.equal(db.attendees.size, 0)
  })

  it('someone who unticked the box after being sent: Brevo contact still deleted', async () => {
    const { admin, db, brevo } = setup()
    db.attendees.set('u2', attendee({ email: 'b@x.com', marketing: false, brevo: 'pending' }))
    assert.equal((await admin.remove('u2')).brevo, 'deleted')
    assert.deepEqual(brevo.forgotten, ['b@x.com'])
  })

  it('never on Brevo: nothing to do there', async () => {
    const { admin, db, brevo } = setup()
    db.attendees.set('u3', attendee({ brevo: 'off' }))
    assert.equal((await admin.remove('u3')).brevo, 'not-needed')
    assert.equal(brevo.forgotten.length, 0)
  })

  it('Brevo unreachable: says what is left to do by hand', async () => {
    const { admin, db, brevo } = setup()
    db.attendees.set('u4', attendee({ marketing: true, brevo: 'sent' }))
    brevo.setDown(true)
    assert.equal((await admin.remove('u4')).brevo, 'failed')
    assert.equal(db.attendees.size, 0, 'the account is still deleted')
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
