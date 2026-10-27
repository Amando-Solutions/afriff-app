// Attendee accounts, tested with a pretend database, mailbox and Brevo list.
// Run: npm run test:accounts (from the main folder).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { COMMON_PINS, pinProblem } from '@afriff/core/accounts/rules'
import { cleanPlan, mergePlans, planFingerprint } from '@afriff/core/accounts/plans'
import { createAccounts, NETWORK_LIMITS, type AccountDeps } from '../logic'
import { hashPin, verifyPin } from '../pin'
import { AccountError } from '../types'
import { fakeList, fakeMail, memoryStore } from './fakes'

const PEPPER = 'test-secret-key-0123456789'
const MIN = 60_000

function setup(opts: { mailReady?: boolean; listReady?: boolean; doubleOptIn?: boolean } = {}) {
  const db = memoryStore()
  const mailbox = fakeMail(opts.mailReady ?? true)
  const brevo = fakeList(opts.listReady ?? true, opts.doubleOptIn ?? false)
  const clock = { t: Date.parse('2026-10-27T10:00:00+01:00') }
  const dropped: string[] = []
  const deps: AccountDeps = {
    store: db.store,
    pepper: PEPPER,
    mail: mailbox.mail,
    list: brevo.list,
    token: async (uid) => `token-for-${uid}`,
    dropLogin: async (uid) => { dropped.push(uid) },
    now: () => clock.t,
  }
  return { accounts: createAccounts(deps), db, mailbox, brevo, clock, dropped }
}

const person = (over: Record<string, unknown> = {}) => ({
  firstName: '  Ada ', lastName: 'Obi', email: 'Ada.Obi@Example.com ', pin: '4826', marketing: false, ...over,
})

/** The AccountError a promise fails with (fails the test if it doesn't) */
async function failure(p: Promise<unknown>): Promise<AccountError> {
  try {
    await p
  } catch (e) {
    assert.ok(e instanceof AccountError, `expected an AccountError, got ${e}`)
    return e
  }
  assert.fail('expected it to fail')
}

describe('PIN rules', () => {
  it('refuses easy PINs and accepts ordinary ones', () => {
    for (const pin of ['1234', '0000', '1111', '4321', '9876', '1212', '1990', '2026', '6969']) assert.ok(pinProblem(pin), pin)
    for (const pin of ['4826', '3071', '8150', '0492']) assert.equal(pinProblem(pin), null, pin)
    for (const pin of ['123', '12345', 'abcd', '12a4', '']) assert.match(pinProblem(pin) ?? '', /4 digits/)
    assert.ok(COMMON_PINS.size > 100 && COMMON_PINS.size < 160, `${COMMON_PINS.size} blocked`)
  })

  it('stores PINs scrambled with a salt and the secret key', async () => {
    const a = await hashPin('4826', PEPPER)
    const b = await hashPin('4826', PEPPER)
    assert.notEqual(a, b, 'a new salt each time')
    assert.ok(!a.includes('4826'))
    assert.equal(await verifyPin('4826', a, PEPPER), true)
    assert.equal(await verifyPin('4827', a, PEPPER), false)
    assert.equal(await verifyPin('4826', a, 'another-secret-key-000'), false, 'useless without the server key')
  })
})

describe('sign up', () => {
  it('creates the account and signs the person in', async () => {
    const { accounts, db, brevo } = setup()
    const s = await accounts.signUp(person(), '')
    assert.match(s.profile.uid, /^att_[\w-]{20}$/)
    assert.equal(s.token, `token-for-${s.profile.uid}`)
    assert.deepEqual(s.profile, { uid: s.profile.uid, firstName: 'Ada', lastName: 'Obi', email: 'Ada.Obi@Example.com', marketing: false })
    const a = db.attendees.get(s.profile.uid)!
    assert.equal(a.emailLower, 'ada.obi@example.com')
    assert.equal(a.createdDay, '2026-10-27')
    assert.equal(a.brevo, 'off')
    assert.equal(a.consentText, '')
    assert.equal(a.optInAtSignUp, 0)
    const secret = db.secrets.get(s.profile.uid)!
    assert.ok(!JSON.stringify(secret).includes('4826'), 'no readable PIN anywhere')
    assert.equal(brevo.members.size, 0, 'unticked people never go to Brevo')
  })

  it('ticked box: joins the Brevo list, with the wording they agreed to', async () => {
    const { accounts, db, brevo } = setup()
    const s = await accounts.signUp(person({ marketing: true }), '')
    const a = db.attendees.get(s.profile.uid)!
    assert.equal(a.brevo, 'sent')
    assert.equal(a.optInAtSignUp, 1)
    assert.equal(a.consentText, 'Yes, AFRIFF can email me festival news and updates.')
    assert.ok(brevo.members.has('Ada.Obi@Example.com'))
  })

  it('only `true` counts as ticked', async () => {
    const { accounts, db } = setup()
    const s = await accounts.signUp(person({ marketing: 'yes' }), '')
    assert.equal(db.attendees.get(s.profile.uid)!.marketing, false)
  })

  it('double opt-in: waits for the person to confirm', async () => {
    const { accounts, db } = setup({ doubleOptIn: true })
    const s = await accounts.signUp(person({ marketing: true }), '')
    assert.equal(db.attendees.get(s.profile.uid)!.brevo, 'confirm-sent')
  })

  it('Brevo not set up yet: ticked people wait, then "Send to Brevo" adds them', async () => {
    const t = setup({ listReady: false })
    const s = await t.accounts.signUp(person({ marketing: true }), '')
    assert.equal(t.db.attendees.get(s.profile.uid)!.brevo, 'pending')
    await assert.rejects(t.accounts.sendWaitingToBrevo(), /isn't set up/)

    // Brevo set up later (same database)
    const brevo = fakeList(true)
    const ready = createAccounts({ store: t.db.store, pepper: PEPPER, mail: t.mailbox.mail, list: brevo.list, token: async () => '', dropLogin: async () => {} })
    assert.deepEqual(await ready.sendWaitingToBrevo(), { done: 1, failed: 0, more: false })
    assert.equal(t.db.attendees.get(s.profile.uid)!.brevo, 'sent')
    assert.ok(brevo.members.has('Ada.Obi@Example.com'))
  })

  it('Brevo down at sign-up: sign-up still works, the problem is saved', async () => {
    const { accounts, db, brevo } = setup()
    brevo.setDown(true)
    const s = await accounts.signUp(person({ marketing: true }), '')
    const a = db.attendees.get(s.profile.uid)!
    assert.equal(a.brevo, 'failed')
    assert.match(a.brevoError, /503/)
    brevo.setDown(false)
    assert.equal((await accounts.sendWaitingToBrevo()).done, 1)
    assert.equal(db.attendees.get(s.profile.uid)!.brevo, 'sent')
  })

  it('refuses missing or bad details, pointing at the field', async () => {
    const { accounts } = setup()
    for (const [over, field] of [
      [{ firstName: ' ' }, 'firstName'], [{ lastName: '' }, 'lastName'], [{ firstName: '<b>' }, 'firstName'],
      [{ email: 'not-an-email' }, 'email'], [{ email: '' }, 'email'],
      [{ pin: '1234' }, 'pin'], [{ pin: '482' }, 'pin'], [{ pin: 4826 }, 'pin'],
    ] as const) {
      const e = await failure(accounts.signUp(person(over), ''))
      assert.equal(e.status, 400)
      assert.equal(e.extra.field, field, JSON.stringify(over))
    }
  })

  it('one account per email, whatever the capitals', async () => {
    const { accounts } = setup()
    await accounts.signUp(person(), '')
    const e = await failure(accounts.signUp(person({ email: 'ada.obi@example.COM' }), ''))
    assert.equal(e.status, 409)
    assert.equal(e.extra.reason, 'exists')
  })
})

describe('log in', () => {
  it('right PIN: signs in on another phone', async () => {
    const { accounts, db } = setup()
    const { profile } = await accounts.signUp(person(), '')
    const s = await accounts.logIn({ email: ' ADA.obi@example.com', pin: '4826' }, '')
    assert.equal(s.profile.uid, profile.uid)
    assert.ok(db.attendees.get(profile.uid)!.lastLoginAt > 0)
  })

  it('unknown email', async () => {
    const { accounts } = setup()
    const e = await failure(accounts.logIn({ email: 'nobody@example.com', pin: '4826' }, ''))
    assert.equal(e.status, 404)
    assert.equal(e.extra.reason, 'unknown')
  })

  it('5 wrong PINs → 15-minute pause (even the right PIN waits), then it opens again', async () => {
    const { accounts, clock, db } = setup()
    const { profile } = await accounts.signUp(person(), '')
    const login = (pin: string) => accounts.logIn({ email: 'ada.obi@example.com', pin }, '')
    for (let i = 1; i <= 4; i++) {
      const e = await failure(login('1111'))
      assert.equal(e.status, 401)
      assert.match(e.message, new RegExp(`${5 - i} tr(y|ies) left, then a 15-minute pause`))
    }
    const fifth = await failure(login('1111'))
    assert.equal(fifth.status, 423)
    assert.equal(fifth.extra.reason, 'paused')
    assert.equal(fifth.extra.minutes, 15)

    clock.t += 10 * MIN
    const waiting = await failure(login('4826'))
    assert.equal(waiting.extra.reason, 'paused')
    assert.equal(waiting.extra.minutes, 5)

    clock.t += 5 * MIN + 1000
    await login('4826')
    assert.equal(db.secrets.get(profile.uid)!.fails, 0, 'the count starts again after a right PIN')
  })

  it('10 wrong in a row → only a new PIN by email opens it', async () => {
    const { accounts, clock } = setup()
    await accounts.signUp(person(), '')
    const login = (pin: string) => accounts.logIn({ email: 'ada.obi@example.com', pin }, '')
    for (let i = 0; i < 5; i++) await failure(login('1111'))
    clock.t += 16 * MIN
    for (let i = 6; i <= 9; i++) assert.match((await failure(login('1111'))).message, new RegExp(`${10 - i} tr(y|ies) left before you'll need a new PIN`))
    const tenth = await failure(login('1111'))
    assert.equal(tenth.extra.reason, 'reset')
    clock.t += 24 * 60 * MIN
    assert.equal((await failure(login('4826'))).extra.reason, 'reset', 'waiting doesn\'t unlock it')
  })

  it('a network trying many accounts is stopped', async () => {
    const { accounts } = setup()
    for (let i = 0; i < 12; i++) await accounts.signUp(person({ email: `p${i}@example.com`, firstName: `P${i}` }), '')
    const ip = 'net-1'
    let blocked: AccountError | null = null
    for (let i = 0; i < NETWORK_LIMITS.fails + 2 && !blocked; i++) {
      const e = await failure(accounts.logIn({ email: `p${i % 12}@example.com`, pin: '5555' }, ip))
      if (e.status === 429) blocked = e
    }
    assert.ok(blocked, 'blocked after the limit')
    assert.equal(blocked!.extra.reason, 'network')
    // a different network is unaffected
    await accounts.logIn({ email: 'p0@example.com', pin: '4826' }, 'net-2').catch((e: AccountError) => assert.notEqual(e.status, 429))
  })
})

describe('forgot PIN', () => {
  async function locked() {
    const t = setup()
    const { profile } = await t.accounts.signUp(person(), '')
    for (let i = 0; i < 5; i++) await failure(t.accounts.logIn({ email: 'ada.obi@example.com', pin: '1111' }, ''))
    return { ...t, uid: profile.uid }
  }

  it('emails a 6-digit code; code + new PIN unlocks the account and signs in', async () => {
    const { accounts, mailbox, db, uid } = await locked()
    const sent = await accounts.sendCode({ email: 'ADA.OBI@example.com' }, '')
    assert.equal(sent.sentTo, 'Ad•••••@Example.com')
    assert.equal(mailbox.sent.length, 1)
    assert.equal(mailbox.sent[0]!.name, 'Ada')
    const code = mailbox.sent[0]!.code
    assert.match(code, /^\d{6}$/)
    assert.ok(!JSON.stringify(db.secrets.get(uid)).includes(code), 'the code is stored scrambled')

    const s = await accounts.resetPin({ email: 'ada.obi@example.com', code, pin: '3071' }, '')
    assert.equal(s.profile.uid, uid)
    await accounts.logIn({ email: 'ada.obi@example.com', pin: '3071' }, '')
    assert.equal((await failure(accounts.logIn({ email: 'ada.obi@example.com', pin: '4826' }, ''))).status, 401, 'old PIN no longer works')
    const e = await failure(accounts.resetPin({ email: 'ada.obi@example.com', code, pin: '8150' }, ''))
    assert.equal(e.extra.reason, 'expired', 'a code works once')
  })

  it('wrong code: 5 tries, then it\'s used up', async () => {
    const { accounts, mailbox } = await locked()
    await accounts.sendCode({ email: 'ada.obi@example.com' }, '')
    const right = mailbox.sent[0]!.code
    const wrong = right === '000000' ? '000001' : '000000'
    for (let left = 4; left >= 1; left--) {
      assert.match((await failure(accounts.resetPin({ email: 'ada.obi@example.com', code: wrong, pin: '3071' }, ''))).message, new RegExp(`${left} tr(y|ies) left`))
    }
    assert.equal((await failure(accounts.resetPin({ email: 'ada.obi@example.com', code: wrong, pin: '3071' }, ''))).extra.reason, 'expired')
    assert.equal((await failure(accounts.resetPin({ email: 'ada.obi@example.com', code: right, pin: '3071' }, ''))).extra.reason, 'expired')
  })

  it('codes expire after 15 minutes; the new PIN must not be an easy one', async () => {
    const { accounts, mailbox, clock } = await locked()
    await accounts.sendCode({ email: 'ada.obi@example.com' }, '')
    const code = mailbox.sent[0]!.code
    assert.equal((await failure(accounts.resetPin({ email: 'ada.obi@example.com', code, pin: '1234' }, ''))).extra.field, 'pin')
    clock.t += 16 * MIN
    assert.equal((await failure(accounts.resetPin({ email: 'ada.obi@example.com', code, pin: '3071' }, ''))).extra.reason, 'expired')
  })

  it('at most 3 code emails an hour; a failed email doesn\'t count', async () => {
    const { accounts, mailbox, clock } = await locked()
    mailbox.failNextSend()
    assert.equal((await failure(accounts.sendCode({ email: 'ada.obi@example.com' }, ''))).status, 502)
    for (let i = 0; i < 3; i++) await accounts.sendCode({ email: 'ada.obi@example.com' }, '')
    assert.equal((await failure(accounts.sendCode({ email: 'ada.obi@example.com' }, ''))).extra.reason, 'codes')
    clock.t += 61 * MIN
    await accounts.sendCode({ email: 'ada.obi@example.com' }, '')
    assert.equal(mailbox.sent.length, 4)
    // only the newest code works
    const codes = mailbox.sent.map((m) => m.code)
    const newest = codes.at(-1)!
    const older = codes.slice(0, -1).find((c) => c !== newest)
    if (older) assert.equal((await failure(accounts.resetPin({ email: 'ada.obi@example.com', code: older, pin: '3071' }, ''))).status, 401)
    await accounts.resetPin({ email: 'ada.obi@example.com', code: newest, pin: '3071' }, '')
  })

  it('no email service: says so instead of pretending', async () => {
    const t = setup({ mailReady: false })
    await t.accounts.signUp(person(), '')
    assert.equal((await failure(t.accounts.sendCode({ email: 'ada.obi@example.com' }, ''))).status, 503)
  })
})

describe('emails switch and deleting', () => {
  it('turning emails on and off moves the person on and off the Brevo list', async () => {
    const { accounts, db, brevo } = setup()
    const { profile } = await accounts.signUp(person(), '')
    assert.equal((await accounts.setMarketing(profile.uid, true)).marketing, true)
    assert.ok(brevo.members.has('Ada.Obi@Example.com'))
    assert.match(db.attendees.get(profile.uid)!.consentText, /^Yes, AFRIFF/)
    assert.equal(db.attendees.get(profile.uid)!.optInAtSignUp, 0, 'sign-up choice is kept for Reports')
    await accounts.setMarketing(profile.uid, false)
    assert.equal(brevo.members.size, 0)
    assert.equal(db.attendees.get(profile.uid)!.brevo, 'removed')
    assert.equal(db.attendees.get(profile.uid)!.consentText, '')
  })

  it('delete: everything goes, including the Brevo contact and the sign-in; the email can sign up again', async () => {
    const { accounts, db, brevo, dropped } = setup()
    const { profile } = await accounts.signUp(person({ marketing: true }), '')
    db.plans.set(profile.uid, { scheduled: ['s1'] })
    assert.deepEqual(await accounts.remove(profile.uid), { brevo: 'deleted' })
    assert.equal(db.attendees.size + db.secrets.size + db.emails.size + db.plans.size, 0)
    assert.deepEqual(brevo.forgotten, ['Ada.Obi@Example.com'])
    assert.deepEqual(dropped, [profile.uid])
    await accounts.signUp(person(), '')
  })

  it('delete someone never sent to Brevo: nothing to do there', async () => {
    const { accounts, brevo } = setup()
    const { profile } = await accounts.signUp(person(), '')
    assert.deepEqual(await accounts.remove(profile.uid), { brevo: 'not-needed' })
    assert.equal(brevo.forgotten.length, 0)
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
    assert.equal(planFingerprint(merged), planFingerprint(mergePlans(phone, account)))
  })

  it('cleaning drops junk and keeps order-independent fingerprints', () => {
    const p = cleanPlan({ scheduled: ['s1', 's1', 42, 'bad id with spaces', 's2'], watched: { x: { date: 'yesterday', rating: 9 }, 'a/b': {} }, queuesChecked: 'nope' })
    assert.deepEqual(p, { scheduled: ['s1', 's2'], watched: { x: { date: '', rating: 5 } }, queuesChecked: [] })
    assert.equal(planFingerprint(cleanPlan({ scheduled: ['b', 'a'] })), planFingerprint(cleanPlan({ scheduled: ['a', 'b'] })))
  })
})
