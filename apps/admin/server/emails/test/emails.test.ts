// Festival emails, tested with a pretend database and a pretend Brevo.
// Run: npm run test:accounts (from the main folder).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cleanDraft, draftProblems, escapeHtml, renderEmail } from '../../../shared/festivalEmail'
import { AccountError } from '../../accounts/types'
import { linkSigner } from '../links'
import { BATCH, createFestivalEmails } from '../logic'
import { MailerError } from '../types'
import { fakeMailer, memoryCampaigns } from './fakes'

const DRAFT = { subject: 'Masterclass registration is open', message: 'Book your seat.\n\nSee https://afriff.com/program.', buttonLabel: 'Register', buttonUrl: 'https://afriff.com/register' }
const BASE = 'https://staff.example.com'
const uid = (i: number) => `user${String(i).padStart(6, '0')}abcd`

function setup(opts: { people?: number; ready?: boolean; clock?: () => number } = {}) {
  const db = memoryCampaigns()
  const brevo = fakeMailer({ ready: opts.ready })
  const signer = linkSigner('test-secret')
  for (let i = 0; i < (opts.people ?? 3); i++) db.attendees.set(uid(i), { email: `p${i}@example.com`, firstName: `Name${i}`, marketing: true })
  const emails = createFestivalEmails({ store: db.store, mailer: brevo.mailer, signer, appUrl: 'https://app.example.com', now: opts.clock })
  return { db, brevo, signer, emails }
}

/** start, then keep pressing on while there's more (what the console does) */
async function sendAll(emails: ReturnType<typeof setup>['emails']) {
  let p = await emails.start(DRAFT, { uid: 'admin1', name: 'Ada Admin' }, BASE)
  while (p.more) p = await emails.continue(p.id)
  return p
}

describe('writing an email (checks shared with the console)', () => {
  it('subject and message are needed; the button needs both its text and an https link', () => {
    assert.deepEqual(Object.keys(draftProblems({ subject: '', message: ' ', buttonLabel: '', buttonUrl: '' })).sort(), ['message', 'subject'])
    assert.deepEqual(draftProblems(DRAFT), {})
    assert.match(draftProblems({ ...DRAFT, buttonUrl: '' }).buttonUrl ?? '', /Add the link/)
    assert.match(draftProblems({ ...DRAFT, buttonLabel: '' }).buttonLabel ?? '', /button's text/)
    assert.match(draftProblems({ ...DRAFT, buttonUrl: 'javascript:alert(1)' }).buttonUrl ?? '', /https/)
    assert.match(draftProblems({ ...DRAFT, buttonUrl: 'http://afriff.com' }).buttonUrl ?? '', /https:\/\/ version/)
    assert.match(draftProblems({ ...DRAFT, subject: 'x'.repeat(151) }).subject ?? '', /Too long/)
  })

  it('tidies spaces and line endings', () => {
    assert.deepEqual(cleanDraft({ subject: '  Hello   there ', message: 'a\r\nb ', buttonLabel: 3 }), { subject: 'Hello there', message: 'a\nb', buttonLabel: '', buttonUrl: '' })
  })
})

describe('how the email looks', () => {
  const html = renderEmail({ ...DRAFT, message: 'Hi <b>all</b> & {{ params.x }}\n\nSecond https://afriff.com/a?b=1&c=2. Done' }, { firstName: 'Ìfẹ́', unsubscribeUrl: `${BASE}/u?x=1&y=2`, appUrl: 'https://app.example.com' })

  it('greets them by name, keeps paragraphs, makes https links clickable', () => {
    assert.match(html, /Hi Ìfẹ́,/)
    assert.equal((html.match(/<p style="margin:0 0 16px;">/g) ?? []).length, 3, 'greeting + 2 paragraphs')
    assert.match(html, /<a href="https:\/\/afriff\.com\/a\?b=1&#38;c=2"/)
    assert.match(html, /2<\/a>\. Done/, 'the full stop stays outside the link')
  })
  it('nothing typed becomes HTML or a Brevo instruction', () => {
    assert.ok(!html.includes('<b>all</b>'))
    assert.ok(!html.includes('{{'))
    assert.equal(escapeHtml('<a href="x">{y}</a>'), '&#60;a href=&#34;x&#34;&#62;&#123;y&#125;&#60;/a&#62;')
  })
  it('has the button, the unsubscribe link and a link to the app', () => {
    assert.match(html, /href="https:\/\/afriff\.com\/register"[^>]*>Register</)
    assert.match(html, /href="https:\/\/staff\.example\.com\/u\?x=1&#38;y=2"[^>]*>Unsubscribe</)
    assert.match(html, /href="https:\/\/app\.example\.com"[^>]*>Open the AFRIFF app</)
  })
  it('no button when it is left empty; "Hello," without a name', () => {
    const plain = renderEmail({ ...DRAFT, buttonLabel: '', buttonUrl: '' }, { firstName: ' ', unsubscribeUrl: BASE, appUrl: BASE })
    assert.ok(!plain.includes('background:#D9A441'))
    assert.match(plain, /Hello,/)
  })
})

describe('sending to everyone who said yes', () => {
  it('only people who said yes, each with their own name and unsubscribe link', async () => {
    const { db, brevo, signer, emails } = setup({ people: 3 })
    db.attendees.set('nope0000000001', { email: 'no@example.com', firstName: 'No', marketing: false })
    const p = await sendAll(emails)
    assert.deepEqual({ status: p.status, sent: p.sent, failed: p.failed, total: p.total, more: p.more }, { status: 'sent', sent: 3, failed: 0, total: 3, more: false })
    assert.deepEqual(brevo.delivered.map((e) => e.to.email), ['p0@example.com', 'p1@example.com', 'p2@example.com'])
    const first = brevo.delivered[0]!
    assert.equal(first.subject, DRAFT.subject)
    assert.match(first.html, /Hi Name0,/)
    assert.ok(first.html.includes(escapeHtml(signer.url(BASE, uid(0)))), 'their own link')
    assert.ok(!first.html.includes(escapeHtml(signer.url(BASE, uid(1)))), 'not someone else\'s')
    const saved = db.emails.get(p.id)!
    assert.equal(saved.status, 'sent')
    assert.equal(saved.createdByName, 'Ada Admin')
    assert.equal(saved.lockUntil, 0)
  })

  it(`in batches of ${BATCH}: one request to Brevo each`, async () => {
    const { brevo, emails } = setup({ people: BATCH * 2 + 7 })
    const p = await sendAll(emails)
    assert.equal(p.sent, BATCH * 2 + 7)
    assert.equal(brevo.calls(), 3)
    assert.equal(new Set(brevo.delivered.map((e) => e.to.email)).size, BATCH * 2 + 7, 'nobody twice')
  })

  it('Brevo\'s daily limit: pauses with the reason, then carries on where it stopped, nobody twice', async () => {
    const { db, brevo, emails } = setup({ people: 120 })
    brevo.setAllowance(BATCH * 2)
    const p = await emails.start(DRAFT, { uid: 'admin1', name: 'Ada' }, BASE)
    assert.equal(p.status, 'paused')
    assert.equal(p.sent, BATCH * 2)
    assert.match(p.error, /about 300 emails a day/)
    assert.equal(db.emails.get(p.id)!.status, 'paused')
    // the next day
    brevo.setAllowance(Infinity)
    let q = await emails.continue(p.id)
    while (q.more) q = await emails.continue(q.id)
    assert.equal(q.status, 'sent')
    assert.equal(q.sent, 120)
    assert.equal(brevo.delivered.length, 120)
    assert.equal(new Set(brevo.delivered.map((e) => e.to.email)).size, 120)
  })

  it('an address Brevo turns down is skipped and listed; the rest still go', async () => {
    const { brevo, db, emails } = setup({ people: 5 })
    brevo.refuse('p2@example.com')
    const p = await sendAll(emails)
    assert.deepEqual({ status: p.status, sent: p.sent, failed: p.failed }, { status: 'sent', sent: 4, failed: 1 })
    assert.deepEqual(db.emails.get(p.id)!.failures.map((f) => f.email), ['p2@example.com'])
    assert.deepEqual(brevo.delivered.map((e) => e.to.email), ['p0@example.com', 'p1@example.com', 'p3@example.com', 'p4@example.com'])
  })

  it('Brevo turning everyone down is not about the addresses: it pauses instead', async () => {
    const { brevo, emails } = setup({ people: 8 })
    for (let i = 0; i < 8; i++) brevo.refuse(`p${i}@example.com`)
    const p = await emails.start(DRAFT, { uid: 'a', name: 'A' }, BASE)
    assert.equal(p.status, 'paused')
    assert.ok(p.failed < 3)
  })

  it('a malformed address in the database is skipped, not sent', async () => {
    const { brevo, db, emails } = setup({ people: 2 })
    db.attendees.set('aaaa0000000000', { email: 'not-an-email', firstName: 'X', marketing: true })
    const p = await sendAll(emails)
    assert.deepEqual({ sent: p.sent, failed: p.failed }, { sent: 2, failed: 1 })
    assert.equal(brevo.delivered.length, 2)
  })

  it('Brevo down or a wrong key: pauses, sends nothing more, says what to do', async () => {
    const { brevo, emails } = setup({ people: 3 })
    brevo.setDown(new MailerError(401, 'Brevo answered 401: Key not found', 'unauthorized'))
    const p = await emails.start(DRAFT, { uid: 'a', name: 'A' }, BASE)
    assert.equal(p.status, 'paused')
    assert.equal(p.sent, 0)
    assert.match(p.error, /NUXT_BREVO_API_KEY/)
  })

  it('someone who unsubscribes before their turn never gets it', async () => {
    const { db, brevo, emails } = setup({ people: BATCH + 5 })
    brevo.setAllowance(BATCH)
    const p = await emails.start(DRAFT, { uid: 'a', name: 'A' }, BASE)
    db.attendees.get(uid(BATCH + 1))!.marketing = false
    brevo.setAllowance(Infinity)
    const q = await emails.continue(p.id)
    assert.equal(q.sent, BATCH + 4)
    assert.ok(!brevo.delivered.some((e) => e.to.email === `p${BATCH + 1}@example.com`))
  })

  it('one sender at a time: a second window is told to wait', async () => {
    const { db, emails } = setup({ people: 3 })
    const p = await emails.start(DRAFT, { uid: 'a', name: 'A' }, BASE)
    db.emails.get(p.id)!.status = 'sending'
    db.emails.get(p.id)!.lockUntil = Date.now() + 60_000
    await assert.rejects(emails.continue(p.id), (e: unknown) => e instanceof AccountError && e.status === 409)
  })

  it('stops after a few seconds and asks to be called again (no long requests)', async () => {
    let t = 0
    const { brevo, emails } = setup({ people: BATCH * 3, clock: () => (t += 3_000) })
    const p = await emails.start(DRAFT, { uid: 'a', name: 'A' }, BASE)
    assert.equal(p.more, true)
    assert.equal(p.status, 'sending')
    let q = p
    while (q.more) q = await emails.continue(q.id)
    assert.equal(q.status, 'sent')
    assert.equal(brevo.delivered.length, BATCH * 3)
  })

  it('pressing on a finished email sends nothing', async () => {
    const { brevo, emails } = setup({ people: 2 })
    const p = await sendAll(emails)
    const again = await emails.continue(p.id)
    assert.equal(again.status, 'sent')
    assert.equal(brevo.delivered.length, 2)
  })

  it('refuses: not set up, a bad draft, nobody to send to', async () => {
    await assert.rejects(setup({ ready: false }).emails.start(DRAFT, { uid: 'a', name: 'A' }, BASE), (e: unknown) => e instanceof AccountError && e.status === 503)
    await assert.rejects(setup().emails.start({ ...DRAFT, subject: '' }, { uid: 'a', name: 'A' }, BASE), (e: unknown) => e instanceof AccountError && e.status === 400)
    await assert.rejects(setup({ people: 0 }).emails.start(DRAFT, { uid: 'a', name: 'A' }, BASE), (e: unknown) => e instanceof AccountError && /Nobody/.test(e.message))
  })
})

describe('the test email', () => {
  it('goes only to the admin, marked [Test], with a link that changes nothing', async () => {
    const { brevo, db, emails } = setup({ people: 3 })
    assert.deepEqual(await emails.test(DRAFT, { email: 'admin@afriff.com', firstName: 'Ada' }, BASE), { to: 'admin@afriff.com' })
    assert.equal(brevo.delivered.length, 1)
    assert.equal(brevo.delivered[0]!.to.email, 'admin@afriff.com')
    assert.equal(brevo.delivered[0]!.subject, `[Test] ${DRAFT.subject}`)
    assert.match(brevo.delivered[0]!.html, /api\/emails\/unsubscribe\?u=test"/)
    assert.equal(db.emails.size, 0, 'not recorded as a sent email')
  })
})

describe('unsubscribe links', () => {
  it('a real link switches that person off; a forged or altered one does nothing', async () => {
    const { db, signer, emails } = setup({ people: 2 })
    const link = new URL(signer.url(BASE, uid(0)))
    const t = link.searchParams.get('t')!
    assert.equal(await emails.unsubscribe(uid(1), t), false, 'someone else\'s token')
    assert.equal(await emails.unsubscribe(uid(0), `${t.slice(0, -1)}x`), false)
    assert.equal(await emails.unsubscribe(uid(0), ''), false)
    assert.equal(db.attendees.get(uid(0))!.marketing, true)
    assert.equal(await emails.unsubscribe(uid(0), t), true)
    assert.equal(db.attendees.get(uid(0))!.marketing, false)
    assert.equal(db.attendees.get(uid(1))!.marketing, true)
  })
  it('links from another secret don\'t work', () => {
    const a = new URL(linkSigner('one').url(BASE, uid(0)))
    assert.equal(linkSigner('two').check(uid(0), a.searchParams.get('t')), false)
    assert.equal(linkSigner('one').check(uid(0), a.searchParams.get('t')), true)
  })
})
