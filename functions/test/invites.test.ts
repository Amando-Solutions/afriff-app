// pushScheduledInvites (src/invites/push.ts), with a pretend database and a
// pretend FCM. Run: npm run functions:test (from the main folder).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cleanInvite } from '../../apps/admin/shared/invites'
import { invitePush, type PersonalPush } from '../../apps/admin/shared/push'
import { HEARTBEAT_MS, HOLD_MS, TOO_LATE_MS, sendScheduledPushes, type Data, type Guest, type Phone, type PushStore, type SendResult } from '../src/invites/push'

const AT = Date.parse('2026-10-31T18:00:00Z')
const EVENT = { name: 'Opening Night Gala', date: '2026-11-01', time: '19:00', endTime: '23:00', venue: 'Filmhouse Landmark', mapLink: '', dressCode: 'Black tie' }

interface FakeGuest extends Guest { status: 'queued' | 'sent' | 'failed' }

/** A pretend database: invites, their guests, linked phones, and the status doc. */
function memory() {
  const invites = new Map<string, Data>()
  const guests = new Map<string, FakeGuest[]>()
  const phones: Phone[] = []
  const statuses: Data[] = []
  const store: PushStore = {
    async due(now) { return [...invites].filter(([, d]) => (d.pushAt as number) > 0 && (d.pushAt as number) <= now).map(([id]) => id) },
    async claim(id, now, until) {
      const d = invites.get(id)
      if (!d || !((d.pushAt as number) > 0 && (d.pushAt as number) <= now) || ((d.pushLockUntil as number) ?? 0) > now || ((d.lockUntil as number) ?? 0) > now) return null
      d.pushLockUntil = until
      return structuredClone(d)
    },
    async sentGuests(id) { return (guests.get(id) ?? []).filter((g) => g.status === 'sent').map(({ status: _s, ...g }) => ({ ...g })) },
    async phonesOf(uids) { return phones.filter((p) => uids.includes(p.uid)) },
    async finish(id, keys, at) {
      for (const g of guests.get(id) ?? []) if (keys.includes(g.key)) g.pushedAt = at
      const d = invites.get(id)!
      Object.assign(d, { pushAt: 0, pushLockUntil: 0, pushed: ((d.pushed as number) ?? 0) + keys.length })
    },
    async unlink(ids) { for (const id of ids) phones.splice(phones.findIndex((p) => p.id === id), 1) },
    async status(s) { statuses.push(structuredClone(s)) },
  }
  return {
    store, invites, guests, phones, statuses,
    /** a scheduled invite, handed to Brevo, due at AT */
    scheduled(id: string, extra: Data = {}) {
      invites.set(id, { kind: 'invite', subject: '', artworkUrl: '', message: '', event: EVENT, status: 'scheduled', scheduledAt: AT, pushAt: AT, pushed: 0, lockUntil: 0, ...extra })
      guests.set(id, [
        { key: 'ada@example.com', uid: 'u1', status: 'sent', pushedAt: 0, unsubscribedAt: 0 },
        { key: 'bola@example.com', uid: 'u2', status: 'sent', pushedAt: 0, unsubscribedAt: 0 },
        { key: 'dayo@example.com', uid: '', status: 'sent', pushedAt: 0, unsubscribedAt: 0 },
      ])
    },
    phone(uid: string, id = `phone-${uid}`) { phones.push({ id, uid, token: `token-${id}` }) },
    guest: (id: string, key: string) => guests.get(id)!.find((g) => g.key === key)!,
  }
}

/** A pretend FCM: what it was asked to send; some tokens can be gone, or everything down. */
function fcm() {
  const sent: { tokens: string[]; push: PersonalPush }[] = []
  const gone = new Set<string>()
  let down: Error | null = null
  return {
    sent, gone,
    setDown: (e: Error | null) => { down = e },
    async send(phones: Phone[], push: PersonalPush): Promise<SendResult[]> {
      if (down) throw down
      sent.push({ tokens: phones.map((p) => p.token), push: structuredClone(push) })
      return phones.map((p) => (gone.has(p.token) ? 'gone' : 'sent'))
    },
  }
}

function setup() {
  const db = memory()
  const f = fcm()
  const beat = { last: 0 }
  const run = (t: number) => sendScheduledPushes({ store: db.store, send: f.send, now: () => t, beat })
  return { db, f, beat, run }
}

describe('push notifications for scheduled invitations', () => {
  it('nothing before the time; at the time, every guest signed in with alerts on, once', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-1')
    db.phone('u1')
    db.phone('u1', 'phone-u1-tablet')
    assert.deepEqual(await run(AT - 60_000), [])
    assert.equal(f.sent.length, 0)

    const r = await run(AT + 30_000)
    assert.deepEqual(r, [{ id: 'inv-1', guests: 2, pushed: 1 }], 'Ada and Bola have app accounts; only Ada has a phone with alerts on; Dayo was added by hand')
    assert.deepEqual(f.sent[0]!.tokens, ['token-phone-u1', 'token-phone-u1-tablet'], 'all of Ada’s phones')
    assert.ok(db.guest('inv-1', 'ada@example.com').pushedAt > 0)
    assert.equal(db.guest('inv-1', 'bola@example.com').pushedAt, 0)
    assert.equal(db.invites.get('inv-1')!.pushed, 1, 'the console shows "1 by push too"')
    assert.equal(db.invites.get('inv-1')!.pushAt, 0, 'done')

    assert.deepEqual(await run(AT + 90_000), [], 'the next minute: nothing again')
    assert.equal(f.sent.length, 1)
  })

  it('says exactly what a Send now push says (the staff app’s own words)', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-w')
    db.phone('u1')
    await run(AT)
    assert.deepEqual(f.sent[0]!.push, invitePush('inv-w', cleanInvite(db.invites.get('inv-w')), AT))
    assert.equal(f.sent[0]!.push.data.title, 'You’re invited: Opening Night Gala')
    assert.equal(f.sent[0]!.push.data.body, 'Sunday 1 November 2026, 7:00 PM · Filmhouse Landmark. Your invitation is in your email.')
  })

  it('an update says "Change of plan"', async () => {
    const { db, f, run } = setup()
    db.scheduled('upd-1', { kind: 'update', message: 'We now start at 8 PM.' })
    db.phone('u2')
    await run(AT)
    assert.equal(f.sent[0]!.push.data.title, 'Change of plan: Opening Night Gala')
    assert.equal(f.sent[0]!.push.data.body, 'We now start at 8 PM. The details are in your email.')
  })

  it('leaves out guests already pushed, unsubscribed, or never handed to Brevo', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-2')
    db.guests.get('inv-2')!.push({ key: 'femi@example.com', uid: 'u3', status: 'queued', pushedAt: 0, unsubscribedAt: 0 })
    db.guest('inv-2', 'ada@example.com').pushedAt = 1
    db.guest('inv-2', 'bola@example.com').unsubscribedAt = 1
    for (const u of ['u1', 'u2', 'u3']) db.phone(u)
    assert.deepEqual(await run(AT), [{ id: 'inv-2', guests: 0, pushed: 0 }])
    assert.equal(f.sent.length, 0)
  })

  it('a phone whose push address is gone is unlinked', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-3')
    db.phone('u1')
    db.phone('u2')
    f.gone.add('token-phone-u2')
    assert.deepEqual(await run(AT), [{ id: 'inv-3', guests: 2, pushed: 1 }])
    assert.deepEqual(db.phones.map((p) => p.uid), ['u1'])
  })

  it('FCM down: nothing marked, tried again once the hold runs out', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-4')
    db.phone('u1')
    f.setDown(new Error('FCM is down'))
    const r = await run(AT)
    assert.equal(r[0]!.error, 'FCM is down')
    assert.equal(db.invites.get('inv-4')!.pushAt, AT, 'still due')
    f.setDown(null)
    assert.deepEqual(await run(AT + 60_000), [], 'held: the failed run might still be going')
    assert.deepEqual(await run(AT + HOLD_MS + 1), [{ id: 'inv-4', guests: 2, pushed: 1 }])
  })

  it('one failing invite doesn’t stop the others', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-a')
    db.scheduled('inv-b')
    db.phone('u1')
    const send = f.send
    let calls = 0
    const flaky = async (p: Phone[], push: PersonalPush) => { if (calls++ === 0) throw new Error('timeout'); return send(p, push) }
    const r = await sendScheduledPushes({ store: db.store, send: flaky, now: () => AT, beat: { last: 0 } })
    assert.equal(r.length, 2)
    assert.equal(r.filter((o) => o.error).length, 1)
    assert.equal(r.filter((o) => o.pushed === 1).length, 1)
  })

  it('waits while the staff app is still handing emails to Brevo', async () => {
    const { db, run } = setup()
    db.scheduled('inv-5', { lockUntil: AT + 45_000 })
    db.phone('u1')
    assert.deepEqual(await run(AT), [])
    assert.deepEqual(await run(AT + 60_000), [{ id: 'inv-5', guests: 2, pushed: 1 }])
  })

  it('more than 3 hours late (deployed afterwards): dropped, not sent', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-6')
    db.phone('u1')
    assert.deepEqual(await run(AT + TOO_LATE_MS + 1), [{ id: 'inv-6', guests: 0, pushed: 0, skipped: 'too-late' }])
    assert.equal(f.sent.length, 0)
    assert.equal(db.invites.get('inv-6')!.pushAt, 0)
  })

  it('a called-off invite (back to waiting for approval) pushes nothing', async () => {
    const { db, f, run } = setup()
    db.scheduled('inv-7', { status: 'review' })
    db.phone('u1')
    assert.deepEqual(await run(AT), [{ id: 'inv-7', guests: 0, pushed: 0, skipped: 'called-off' }])
    assert.equal(f.sent.length, 0)
  })

  it('tells the console it’s running: on the first run, every 10 minutes, and whenever it pushed', async () => {
    const { db, run } = setup()
    await run(AT)
    await run(AT + 60_000)
    assert.deepEqual(db.statuses, [{ checkedAt: AT }], 'not every minute')
    await run(AT + HEARTBEAT_MS)
    assert.equal(db.statuses.length, 2)
    db.scheduled('inv-8', { pushAt: AT + HEARTBEAT_MS + 60_000 })
    db.phone('u1')
    await run(AT + HEARTBEAT_MS + 60_000)
    assert.deepEqual(db.statuses.at(-1), { checkedAt: AT + HEARTBEAT_MS + 60_000, last: { at: AT + HEARTBEAT_MS + 60_000, invites: [{ id: 'inv-8', guests: 2, pushed: 1 }] } })
  })
})
