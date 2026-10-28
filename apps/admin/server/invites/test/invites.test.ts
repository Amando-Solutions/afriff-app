// Invitations, contacts and guest lists, tested with a pretend database and a
// pretend Brevo. Run: npm run test:accounts (from the main folder).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emptyContact, mergePeople, resolveAudience } from '../../../shared/contacts'
import {
  calendarFile, clockText, cleanInvite, defaultSubject, eventDateText, googleCalendarLink, inviteProblems, renderInvite, subjectOf,
  type InviteContent,
} from '../../../shared/invites'
import { AccountError } from '../../accounts/types'
import { MailerError } from '../../emails/types'
import { inviteLinkSigner, TEST_GUEST } from '../links'
import { BATCH, SCHEDULE_MAX_MS, createInvites, tagFor } from '../logic'
import type { InviteRecord, OneEmail } from '../types'
import { fakeInviteMailer, fakePusher, memoryInvites } from './fakes'

const BASE = 'https://staff.example.com'
const APP = 'https://app.example.com'
const NOW = Date.parse('2026-10-28T09:00:00Z')
const EVENT = { name: 'Opening Night Gala', date: '2026-11-01', time: '19:00', endTime: '23:00', venue: 'Filmhouse Landmark', mapLink: '', dressCode: 'Black tie' }
const INVITE: InviteContent = { kind: 'invite', subject: '', artworkUrl: '', message: '', event: EVENT }
const WITH_ART: InviteContent = { ...INVITE, subject: 'Your invitation', artworkUrl: 'https://afriff.com/art.jpg', message: 'We would love to see you.' }

function setup(opts: { clock?: () => number } = {}) {
  const db = memoryInvites()
  const brevo = fakeInviteMailer()
  const phones = fakePusher()
  const links = inviteLinkSigner('test-secret')
  let n = 0
  const inv = createInvites({ store: db.store, mailer: brevo.mailer, links, pusher: phones.pusher, appUrl: APP, now: opts.clock ?? (() => NOW), newBatchId: () => `batch-${++n}` })
  db.groups.set('vip', 'Gala VIPs')
  db.groups.set('press', 'Press')
  return { db, brevo, phones, links, inv }
}

function draft(db: ReturnType<typeof memoryInvites>, id: string, content: InviteContent, audience: Partial<InviteRecord['audience']> = {}, extra: Partial<InviteRecord> = {}) {
  db.invites.set(id, {
    ...content, id, audience: { groups: [], people: [], exclude: [], ...audience }, parentId: '', status: 'review', scheduledAt: 0, pushAt: 0, batchId: '',
    total: 0, sent: 0, failed: 0, failures: [], runs: 0, lockUntil: 0, error: '', linkBase: '', groupNames: [], unsubscribed: 0, pushed: 0,
    createdByName: 'Ed Editor', sentByName: '', sentAt: 0, finishedAt: 0, ...extra,
  })
}

/** start, then keep pressing on while there's more (what the console does) */
async function sendAll(inv: ReturnType<typeof setup>['inv'], id: string, mode: 'all' | 'new' | 'resend' = 'all', scheduledAt?: number) {
  let p = await inv.start(id, mode, { scheduledAt }, { name: 'Ada Admin' }, BASE)
  while (p.more) p = await inv.continue(id)
  return p
}

const rejects = (work: Promise<unknown>, status: number, message: RegExp) =>
  assert.rejects(work, (e: unknown) => e instanceof AccountError && e.status === status && message.test(e.message))

/** the guest's own unsubscribe link, as it is in their email */
function unsubscribeOf(e: OneEmail): URL {
  const m = /href="([^"]*\/api\/invites\/unsubscribe[^"]*)"/.exec(e.html)
  assert.ok(m, 'an unsubscribe link')
  return new URL(m[1]!.replace(/&#38;/g, '&'))
}
const args = (u: URL) => [u.searchParams.get('i'), u.searchParams.get('p'), u.searchParams.get('t')] as const

// ---------------------------------------------------------------------------

describe('an invite’s details (checks shared with the console)', () => {
  it('needs the event name, day, time and place; the rest is optional', () => {
    assert.deepEqual(Object.keys(inviteProblems(cleanInvite({}))).sort(), ['event.date', 'event.name', 'event.time', 'event.venue'])
    assert.deepEqual(inviteProblems(INVITE), {})
    assert.deepEqual(inviteProblems(WITH_ART), {})
    assert.match(inviteProblems({ ...WITH_ART, artworkUrl: 'http://x.com/a.jpg' }).artworkUrl ?? '', /https/)
    assert.match(inviteProblems({ ...WITH_ART, artworkUrl: '/local.jpg' }).artworkUrl ?? '', /https/)
    assert.match(inviteProblems({ ...INVITE, event: { ...EVENT, date: '2026-02-30' } })['event.date'] ?? '', /real date/)
    assert.match(inviteProblems({ ...INVITE, event: { ...EVENT, endTime: '19:00' } })['event.endTime'] ?? '', /same/)
    assert.match(inviteProblems({ ...INVITE, event: { ...EVENT, mapLink: 'javascript:alert(1)' } })['event.mapLink'] ?? '', /https/)
    assert.match(inviteProblems({ ...INVITE, subject: 'x'.repeat(151) }).subject ?? '', /Too long/)
    assert.match(inviteProblems({ ...INVITE, kind: 'update' }).message ?? '', /changed/)
  })

  it('writes dates and times the way guests read them', () => {
    assert.equal(eventDateText('2026-11-01'), 'Sunday 1 November 2026')
    assert.equal(clockText('19:00'), '7:00 PM')
    assert.equal(clockText('00:30'), '12:30 AM')
    assert.equal(clockText('12:05'), '12:05 PM')
  })

  it('a subject left empty becomes "You’re invited: …" (an update: "Change of plan: …")', () => {
    assert.equal(subjectOf(INVITE), 'You’re invited: Opening Night Gala')
    assert.equal(defaultSubject({ ...INVITE, kind: 'update' }), 'Change of plan: Opening Night Gala')
    assert.equal(subjectOf(WITH_ART), 'Your invitation')
  })
})

describe('the invitation email', () => {
  const links = { calendar: 'https://c.example/cal?a=1&b=2', app: APP, unsubscribe: 'https://u.example/x' }
  const html = renderInvite(WITH_ART, { firstName: 'Ìfẹ́', lastName: 'Adé' }, links)

  it('greets the guest by name and says they are on the guest list', () => {
    assert.match(html, /Dear Ìfẹ́,/)
    assert.match(html, /Ìfẹ́ Adé/)
    assert.match(html, /Your name is on the guest list\./)
    assert.match(html, /You’re invited/)
  })
  it('every detail is real text, not only in the artwork', () => {
    for (const t of ['Opening Night Gala', 'Sunday 1 November 2026', '7:00 PM – 11:00 PM', 'Filmhouse Landmark', 'Black tie', 'We would love to see you.']) assert.ok(html.includes(t), t)
    assert.match(html, /<img src="https:\/\/afriff\.com\/art\.jpg" width="600" alt="Opening Night Gala"/)
  })
  it('has Add to calendar, Get directions (once), the AFRIFF emblem, the app and the guest’s own unsubscribe link', () => {
    assert.match(html, /href="https:\/\/c\.example\/cal\?a=1&#38;b=2"[^>]*>Add to calendar/)
    assert.match(html, /href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&#38;query=Filmhouse%20Landmark%2C%20Lagos"[^>]*>Get directions/)
    assert.equal(html.match(/Get directions/g)?.length, 1)
    assert.match(html, /<img src="https:\/\/app\.example\.com\/pwa-192x192\.png"/)
    assert.match(html, /href="https:\/\/u\.example\/x"[^>]*>Unsubscribe/)
  })
  it('with no message, a standard sentence; with no artwork or dress code, those parts are left out', () => {
    const plain = renderInvite(INVITE, { firstName: 'Ada', lastName: '' }, links)
    assert.match(plain, /It would be our pleasure to have you as our guest/)
    assert.ok(!/<img src="https:\/\/afriff/.test(plain))
    const noDress = renderInvite({ ...INVITE, event: { ...EVENT, dressCode: '' } }, { firstName: 'Ada', lastName: '' }, links)
    assert.ok(!noDress.includes('Dress code'))
  })
  it('nothing typed becomes HTML or code', () => {
    const evil = renderInvite({ ...WITH_ART, message: 'Hi <b>all</b> {{ params.x }}', event: { ...EVENT, name: '<script>x</script>' } }, { firstName: '<i>A</i>', lastName: '' }, links)
    assert.ok(!evil.includes('<b>all</b>'))
    assert.ok(!evil.includes('<script>x'))
    assert.ok(!evil.includes('<i>A</i>'))
    assert.ok(!evil.includes('{{'))
  })
  it('an update says "Change of plan" and that their place is unchanged', () => {
    const u = renderInvite({ ...INVITE, kind: 'update', message: 'We now start at 8 PM.' }, { firstName: 'Ada', lastName: 'Obi' }, links)
    assert.match(u, /Change of plan/)
    assert.match(u, /We now start at 8 PM\./)
    assert.match(u, /Your place on the guest list is unchanged\./)
    assert.ok(!u.includes('It would be our pleasure'))
  })
})

describe('Add to calendar', () => {
  it('uses Lagos time (UTC+1), and an end after midnight is the next day', () => {
    const ics = calendarFile(INVITE, { id: 'inv1', appUrl: APP, now: new Date(NOW) })
    assert.match(ics, /DTSTART:20261101T180000Z/)
    assert.match(ics, /DTEND:20261101T220000Z/)
    assert.match(ics, /SUMMARY:Opening Night Gala/)
    assert.match(ics, /\r\n/)
    const late = calendarFile({ ...INVITE, event: { ...EVENT, time: '22:00', endTime: '02:00' } }, { id: 'x', appUrl: '', now: new Date(NOW) })
    assert.match(late, /DTEND:20261102T010000Z/)
    assert.match(googleCalendarLink(INVITE), /dates=20261101T180000Z%2F20261101T220000Z/)
  })
})

describe('contacts: one person per email, and who may be emailed', () => {
  it('a sign-up and a hand-added guest with the same email are one contact; their own app choice decides', () => {
    const people = mergePeople(
      [{ uid: 'u1', firstName: 'Ada', lastName: 'Obi', email: 'Ada@Example.com', marketing: false, createdAt: 5 }],
      [{ ...emptyContact('ada@example.com'), firstName: 'A.', lastName: 'Obi', email: 'ada@example.com', source: 'afriff', vip: true, groups: ['vip'], agreed: true, agreedByName: 'Admin', agreedAt: 1, addedByName: 'Admin', createdAt: 1 }],
    )
    assert.equal(people.length, 1)
    const [ada] = people
    assert.equal(ada!.firstName, 'Ada', 'their account’s name wins')
    assert.equal(ada!.source, 'afriff')
    assert.equal(ada!.consent, 'app-no')
    assert.equal(ada!.canEmail, false)
  })

  it('whole groups + picked − left out, each once, only those who can be emailed', () => {
    const { db } = setup()
    db.signUp('u1', 'ada@example.com', 'Ada', 'Obi', true)
    db.signUp('u2', 'bola@example.com', 'Bola', 'Ade', false)
    db.signUp('u3', 'chi@example.com', 'Chi', 'Eze', true)
    db.contact('ada@example.com', { groups: ['vip', 'press'], vip: true })
    db.contact('bola@example.com', { groups: ['vip'] })
    db.contact('dayo@example.com', { source: 'afriff', firstName: 'Dayo', lastName: 'Bello', groups: ['vip'], agreed: true })
    db.contact('efe@example.com', { source: 'afriff', firstName: 'Efe', lastName: 'Ola', groups: ['vip'], agreed: true, unsubscribedAt: 3 })
    db.contact('fola@example.com', { source: 'afriff', firstName: 'Fola', lastName: 'Ige', groups: ['press'], agreed: true })
    const people = mergePeople([...db.attendees.values()], [...db.contacts.values()])
    const r = resolveAudience(people, { groups: ['vip', 'press'], people: ['ada@example.com', 'chi@example.com'], exclude: ['fola@example.com'] })
    assert.deepEqual(r.send.map((p) => p.firstName), ['Dayo', 'Chi', 'Ada'], 'A–Z by last name')
    assert.deepEqual(r.skipped.map((s) => [s.person.firstName, s.reason]), [['Bola', 'no-consent'], ['Efe', 'unsubscribed']])
    assert.equal(r.excluded, 1)
    assert.equal(r.duplicates, 2, 'Ada is in two groups and picked too: counted once')
  })
})

// ---------------------------------------------------------------------------

function threeGuests(db: ReturnType<typeof memoryInvites>) {
  db.signUp('u1', 'ada@example.com', 'Ada', 'Obi', true)
  db.signUp('u2', 'bola@example.com', 'Bola', 'Ade', true)
  db.contact('ada@example.com', { groups: ['vip'], vip: true, source: 'vip-link', uid: 'u1' })
  db.contact('bola@example.com', { groups: ['vip'] })
  db.contact('dayo@example.com', { source: 'afriff', firstName: 'Dayo', lastName: 'Bello', groups: ['vip'], agreed: true, vip: true })
}

describe('sending an invite', () => {
  it('goes to each guest once, made for them, with their own unsubscribe link', async () => {
    const { db, brevo, links, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-open', INVITE, { groups: ['vip'], people: ['ada@example.com'] })
    const p = await sendAll(inv, 'inv-open')
    assert.equal(p.status, 'sent')
    assert.equal(p.sent, 3)
    const emails = brevo.emails()
    assert.deepEqual(emails.map((e) => e.to.email).sort(), ['ada@example.com', 'bola@example.com', 'dayo@example.com'])
    assert.equal(brevo.batches[0]!.tag, tagFor('inv-open'))
    const dayo = emails.find((e) => e.to.email === 'dayo@example.com')!
    assert.equal(dayo.subject, 'You’re invited: Opening Night Gala')
    assert.equal(dayo.to.name, 'Dayo Bello')
    assert.match(dayo.html, /Dear Dayo,/)
    assert.match(dayo.html, /Dayo Bello/)
    assert.ok(!dayo.html.includes('Dear Ada'))
    assert.ok(dayo.html.includes(`${BASE}/api/invites/calendar?i=inv-open`))
    assert.equal(links.check(...args(unsubscribeOf(dayo))), 'dayo@example.com')
    // the guest list
    const guests = db.guests('inv-open')
    assert.ok(guests.every((g) => g.status === 'sent' && g.run === 1))
    assert.deepEqual(guests.find((g) => g.key === 'dayo@example.com')!.groups, ['Gala VIPs'])
    assert.equal(guests.find((g) => g.key === 'dayo@example.com')!.addedByAfriff, true)
    assert.deepEqual(db.invites.get('inv-open')!.groupNames, ['Gala VIPs'])
  })

  it('a typed subject is used as it is', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-subj', WITH_ART, { groups: ['vip'] })
    await sendAll(inv, 'inv-subj')
    assert.ok(brevo.emails().every((e) => e.subject === 'Your invitation'))
  })

  it('can\'t go out twice, unfinished, or to nobody', async () => {
    const { db, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-a', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-a')
    await rejects(inv.start('inv-a', 'all', {}, { name: 'A' }, BASE), 409, /already gone out/)
    draft(db, 'inv-half', { ...INVITE, event: { ...EVENT, venue: '' } }, { groups: ['vip'] })
    await rejects(inv.start('inv-half', 'all', {}, { name: 'A' }, BASE), 400, /Where is it/)
    draft(db, 'inv-none', INVITE, { groups: ['press'] })
    await rejects(inv.start('inv-none', 'all', {}, { name: 'A' }, BASE), 400, /Nobody on this invite/)
  })

  it('the count before sending matches who gets it', async () => {
    const { db, inv } = setup()
    threeGuests(db)
    db.signUp('u9', 'zee@example.com', 'Zee', 'Abu', false)
    db.contact('zee@example.com', { groups: ['vip'] })
    draft(db, 'inv-c', INVITE, { groups: ['vip'], exclude: ['bola@example.com'] })
    const c = await inv.count('inv-c')
    assert.equal(c.send, 2)
    assert.deepEqual(c.skipped, { 'no-consent': 1 })
    assert.equal(c.excluded, 1)
    assert.equal((await sendAll(inv, 'inv-c')).sent, 2)
  })

  it('in batches of 50; a daily limit pauses it, Continue sending carries on, nobody gets it twice', async () => {
    const { db, brevo, inv } = setup()
    for (let i = 0; i < 120; i++) {
      const email = `g${String(i).padStart(3, '0')}@example.com`
      db.contact(email, { source: 'afriff', firstName: `G${i}`, lastName: 'X', groups: ['vip'], agreed: true })
    }
    draft(db, 'inv-big', INVITE, { groups: ['vip'] })
    brevo.setAllowance(60)
    const paused = await sendAll(inv, 'inv-big')
    assert.equal(paused.status, 'paused')
    assert.equal(paused.sent, BATCH)
    assert.match(paused.error, /300 emails a day/)
    brevo.setAllowance(Infinity)
    let p = await inv.continue('inv-big')
    while (p.more) p = await inv.continue('inv-big')
    assert.equal(p.status, 'sent')
    assert.equal(p.sent, 120)
    const to = brevo.emails().map((e) => e.to.email)
    assert.equal(new Set(to).size, 120)
    assert.equal(to.length, 120)
  })

  it('an address Brevo turns down is skipped and listed; the rest go', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    brevo.refuse('bola@example.com')
    draft(db, 'inv-r', INVITE, { groups: ['vip'] })
    const p = await sendAll(inv, 'inv-r')
    assert.equal(p.status, 'sent')
    assert.equal(p.sent, 2)
    assert.equal(p.failed, 1)
    assert.equal(db.invites.get('inv-r')!.failures[0]!.email, 'bola@example.com')
  })

  it('one sender at a time', async () => {
    const { db, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-l', INVITE, { groups: ['vip'] }, { status: 'sending', lockUntil: NOW + 60_000 })
    await rejects(inv.continue('inv-l'), 409, /being sent right now/)
  })
})

describe('late additions, updates and bounced addresses', () => {
  it('"Send to new people only" sends just the ones not on it yet', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-n', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-n')
    await rejects(inv.start('inv-n', 'new', {}, { name: 'A' }, BASE), 400, /Nobody new/)
    db.contact('femi@example.com', { source: 'afriff', firstName: 'Femi', lastName: 'Kuti', groups: ['vip'], agreed: true })
    assert.equal((await inv.count('inv-n')).newPeople, 1)
    const before = brevo.emails().length
    const p = await sendAll(inv, 'inv-n', 'new')
    assert.equal(p.status, 'sent')
    assert.deepEqual(brevo.emails().slice(before).map((e) => e.to.email), ['femi@example.com'])
    assert.equal(db.guests('inv-n').find((g) => g.key === 'femi@example.com')!.run, 2)
  })

  it('an update goes to the people the invite went to (not anyone who unsubscribed since)', async () => {
    const { db, brevo, links, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-p', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-p')
    // Bola unsubscribes using the invite's link
    assert.equal(await inv.unsubscribe(...args(unsubscribeOf(brevo.emails().find((e) => e.to.email === 'bola@example.com')!))), true)
    // someone joins the group after the invite: not on the update
    db.contact('femi@example.com', { source: 'afriff', firstName: 'Femi', lastName: 'Kuti', groups: ['vip'], agreed: true })
    draft(db, 'upd-p', { ...INVITE, kind: 'update', message: 'We now start at 8 PM.' }, {}, { parentId: 'inv-p' })
    const before = brevo.emails().length
    await sendAll(inv, 'upd-p')
    const sent = brevo.emails().slice(before)
    assert.deepEqual(sent.map((e) => e.to.email).sort(), ['ada@example.com', 'dayo@example.com'])
    assert.equal(sent[0]!.subject, 'Change of plan: Opening Night Gala')
    assert.match(sent[0]!.html, /Change of plan/)
    assert.equal(links.check('x', 'y', 'z'), null)
  })

  it('a bounced address is listed; fixed, it goes again to the new one (and a hand-added guest\'s contact follows)', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    db.contacts.get('dayo@example.com')!.email = 'dayo@exmaple.com'
    db.contacts.set('dayo@exmaple.com', { ...db.contacts.get('dayo@example.com')!, key: 'dayo@exmaple.com' })
    db.contacts.delete('dayo@example.com')
    draft(db, 'inv-b', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-b')
    brevo.bounce(tagFor('inv-b'), 'dayo@exmaple.com')
    const s1 = await inv.stats('inv-b')
    assert.equal(s1.stats?.hardBounces, 1)
    assert.deepEqual(s1.problems.map((p) => [p.email, p.key, p.name]), [['dayo@exmaple.com', 'dayo@exmaple.com', 'Dayo Bello']])
    await rejects(inv.start('inv-b', 'resend', {}, { name: 'A' }, BASE), 400, /No fixed addresses/)
    const fixed = await inv.fix('inv-b', 'dayo@exmaple.com', 'dayo@example.com')
    assert.equal(fixed.contactUpdated, true)
    assert.ok(db.contacts.has('dayo@example.com') && !db.contacts.has('dayo@exmaple.com'))
    assert.equal((await inv.stats('inv-b')).problems[0]!.fixedTo, 'dayo@example.com')
    const before = brevo.emails().length
    const p = await sendAll(inv, 'inv-b', 'resend')
    assert.equal(p.status, 'sent')
    assert.deepEqual(brevo.emails().slice(before).map((e) => e.to.email), ['dayo@example.com'])
  })
})

describe('push notifications to guests’ phones', () => {
  it('guests who use the app (signed in, alerts on) also get a push; hand-added guests get the email only', async () => {
    const { db, brevo, phones, inv } = setup()
    threeGuests(db)
    phones.phone('u1')
    draft(db, 'inv-push', INVITE, { groups: ['vip'] })
    const p = await sendAll(inv, 'inv-push')
    assert.equal(brevo.emails().length, 3, 'everyone still gets the email')
    assert.equal(phones.pushes.length, 1)
    assert.deepEqual(phones.pushes[0]!.uids.sort(), ['u1', 'u2'], 'only app users are asked for (Dayo was added by hand)')
    assert.deepEqual(phones.pushes[0]!.push.data, {
      title: 'You’re invited: Opening Night Gala',
      body: 'Sunday 1 November 2026, 7:00 PM · Filmhouse Landmark. Your invitation is in your email.',
      url: '/',
      tag: 'invite-inv-push',
    })
    assert.equal(phones.pushes[0]!.push.ttlSeconds, 3 * 24 * 3600, 'kept for 3 days at most')
    assert.equal(p.pushed, 1, 'Bola has no phone with alerts on')
    assert.equal(db.invites.get('inv-push')!.pushed, 1)
    const guests = db.guests('inv-push')
    assert.ok(guests.find((g) => g.uid === 'u1')!.pushedAt > 0)
    assert.equal(guests.find((g) => g.uid === 'u2')!.pushedAt, 0)
    assert.equal(guests.find((g) => g.key === 'dayo@example.com')!.pushedAt, 0)
  })

  it('an update’s push says "Change of plan" and what changed', async () => {
    const { db, phones, inv } = setup()
    threeGuests(db)
    phones.phone('u1')
    draft(db, 'inv-pu', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-pu')
    draft(db, 'upd-pu', { ...INVITE, kind: 'update', message: 'We now start at 8 PM.' }, {}, { parentId: 'inv-pu' })
    await sendAll(inv, 'upd-pu')
    const last = phones.pushes.at(-1)!
    assert.equal(last.push.data.title, 'Change of plan: Opening Night Gala')
    assert.equal(last.push.data.body, 'We now start at 8 PM. The details are in your email.')
    assert.equal(db.invites.get('upd-pu')!.pushed, 1)
  })

  it('nobody gets it twice: "new people only" pushes just the new guests', async () => {
    const { db, phones, inv } = setup()
    threeGuests(db)
    phones.phone('u1')
    draft(db, 'inv-p2', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-p2')
    db.signUp('u3', 'femi@example.com', 'Femi', 'Kuti', true)
    db.contact('femi@example.com', { groups: ['vip'] })
    phones.phone('u3')
    const p = await sendAll(inv, 'inv-p2', 'new')
    assert.deepEqual(phones.pushes.at(-1)!.uids, ['u3'])
    assert.equal(p.pushed, 2)
  })

  it('a scheduled invite pushes nothing now: it is marked for the Cloud Function to push at its time', async () => {
    const { db, brevo, phones, inv } = setup()
    threeGuests(db)
    phones.phone('u1')
    draft(db, 'inv-ps', INVITE, { groups: ['vip'] })
    const at = NOW + 24 * 3_600_000
    await sendAll(inv, 'inv-ps', 'all', at)
    assert.equal(brevo.emails().length, 3)
    assert.equal(phones.pushes.length, 0)
    assert.equal(db.invites.get('inv-ps')!.pushed, 0)
    assert.equal(db.invites.get('inv-ps')!.pushAt, at, 'pushScheduledInvites sends them then')
  })

  it('Send now marks nothing for the Cloud Function (its pushes went already)', async () => {
    const { db, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-pnow', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-pnow')
    assert.equal(db.invites.get('inv-pnow')!.pushAt, 0)
  })

  it('a push failing never stops the emails', async () => {
    const { db, brevo, phones, inv } = setup()
    threeGuests(db)
    phones.phone('u1')
    phones.setDown(new Error('FCM is down'))
    draft(db, 'inv-pf', INVITE, { groups: ['vip'] })
    const p = await sendAll(inv, 'inv-pf')
    assert.equal(p.status, 'sent')
    assert.equal(brevo.emails().length, 3)
    assert.equal(p.pushed, 0)
  })
})

describe('scheduling (Lagos time picked in the console, held by Brevo)', () => {
  it('hands every batch to Brevo with the time and one batch id; then it says Scheduled', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-s', INVITE, { groups: ['vip'] })
    const at = NOW + 24 * 3_600_000
    const p = await sendAll(inv, 'inv-s', 'all', at)
    assert.equal(p.status, 'scheduled')
    assert.ok(brevo.batches.every((b) => b.scheduledAt === new Date(at).toISOString() && b.batchId === 'batch-1'))
    // late additions wait for the same moment
    db.contact('femi@example.com', { source: 'afriff', firstName: 'Femi', lastName: 'Kuti', groups: ['vip'], agreed: true })
    await sendAll(inv, 'inv-s', 'new')
    assert.equal(brevo.batches.at(-1)!.batchId, 'batch-1')
    assert.equal(db.invites.get('inv-s')!.status, 'scheduled')
  })

  it('at least 10 minutes and at most 71 hours ahead', async () => {
    const { db, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-t', INVITE, { groups: ['vip'] })
    await rejects(inv.start('inv-t', 'all', { scheduledAt: NOW + 60_000 }, { name: 'A' }, BASE), 400, /10 minutes/)
    await rejects(inv.start('inv-t', 'all', { scheduledAt: NOW + SCHEDULE_MAX_MS + 1 }, { name: 'A' }, BASE), 400, /3 days/)
  })

  it('calling it off asks Brevo to drop it and puts it back to waiting for approval', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-x', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-x', 'all', NOW + 3_600_000)
    await inv.cancel('inv-x')
    assert.deepEqual(brevo.cancelled, ['batch-1'])
    assert.equal(db.invites.get('inv-x')!.status, 'review')
    assert.equal(db.invites.get('inv-x')!.pushAt, 0, 'no pushes for a called-off invite')
    assert.equal(db.guests('inv-x').length, 0)
    // and it can be sent again afterwards
    assert.equal((await sendAll(inv, 'inv-x')).status, 'sent')
  })

  it('too late to call off once the time has come', async () => {
    let t = NOW
    const { db, inv } = setup({ clock: () => t })
    threeGuests(db)
    draft(db, 'inv-y', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-y', 'all', NOW + 3_600_000)
    t = NOW + 3_600_000 - 30_000
    await rejects(inv.cancel('inv-y'), 409, /Too late/)
  })
})

describe('test sends', () => {
  it('to up to 5 addresses typed in, marked [Test], using a contact\'s name when the address is theirs', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-tt', WITH_ART, { groups: ['vip'] }, { status: 'draft' })
    const r = await inv.test('inv-tt', 'ada@example.com, me@afriff.app', BASE)
    assert.deepEqual(r.to, ['ada@example.com', 'me@afriff.app'])
    const [a, me] = brevo.emails()
    assert.equal(a!.subject, '[Test] Your invitation')
    assert.match(a!.html, /Dear Ada,/)
    assert.match(me!.html, /Dear Guest,/)
    assert.match(me!.html, /unsubscribe\?p=test/)
    assert.equal(brevo.batches[0]!.tag, 'afriff-invite-test')
    assert.equal(db.invites.get('inv-tt')!.status, 'draft', 'a test changes nothing')
    await rejects(inv.test('inv-tt', 'a@x.com b@x.com c@x.com d@x.com e@x.com f@x.com', BASE), 400, /5 addresses/)
    await rejects(inv.test('inv-tt', 'not-an-email', BASE), 400, /@/)
  })

  it('with no subject typed, the test uses the standard one', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-tt2', INVITE, {}, { status: 'draft' })
    await inv.test('inv-tt2', ['me@afriff.app'], BASE)
    assert.equal(brevo.emails()[0]!.subject, '[Test] You’re invited: Opening Night Gala')
  })
})

describe('unsubscribe links', () => {
  it('switch emails off for that guest only (app account and AFRIFF’s record), counted once per invite', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    draft(db, 'inv-u', INVITE, { groups: ['vip'] })
    await sendAll(inv, 'inv-u')
    const link = (email: string) => unsubscribeOf(brevo.emails().find((e) => e.to.email === email)!)
    const ada = link('ada@example.com')
    const dayo = link('dayo@example.com')
    assert.equal(await inv.unsubscribe(...args(ada)), true)
    assert.equal(db.attendees.get('u1')!.marketing, false)
    assert.equal(db.attendees.get('u2')!.marketing, true, 'nobody else')
    await inv.unsubscribe(...args(dayo))
    assert.equal(db.contacts.get('dayo@example.com')!.agreed, false)
    assert.ok(db.contacts.get('dayo@example.com')!.unsubscribedAt > 0)
    await inv.unsubscribe(...args(ada))
    assert.equal(db.invites.get('inv-u')!.unsubscribed, 2)
    // forged: someone else's address, or another invite
    assert.equal(await inv.unsubscribe('inv-u', Buffer.from('bola@example.com').toString('base64url'), ada.searchParams.get('t')), false)
    assert.equal(await inv.unsubscribe('inv-other', ada.searchParams.get('p'), ada.searchParams.get('t')), false)
    assert.equal(inv.checkLink(undefined, TEST_GUEST, undefined), TEST_GUEST)
  })
})

describe('Brevo problems', () => {
  it('a wrong key or Brevo down pauses with what to do', async () => {
    const { db, brevo, inv } = setup()
    threeGuests(db)
    brevo.setDown(new MailerError(401, 'Brevo answered 401: Key not found', 'unauthorized'))
    draft(db, 'inv-k', INVITE, { groups: ['vip'] })
    const p = await sendAll(inv, 'inv-k')
    assert.equal(p.status, 'paused')
    assert.match(p.error, /NUXT_BREVO_API_KEY/)
    brevo.setDown(null)
    let q = await inv.continue('inv-k')
    while (q.more) q = await inv.continue('inv-k')
    assert.equal(q.sent, 3)
  })
})
