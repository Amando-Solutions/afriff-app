// Input checks for every form in both apps: attendee accounts (sign-up, log
// in, forgot password), the console's data forms, and the links phones accept.
// Run: npm run test:accounts (from the main folder).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { confirmProblem, emailProblem, emailSuggestion, nameProblem, passwordProblem } from '@afriff/core/accounts/rules'
import { imageLink, videoLink, webLink } from '@afriff/core/utils/links'
import { replaceProgramme, FILMS, NEWS, SPONSORS, HOW_TO_ATTEND } from '@afriff/core/data/programme'
import { EVENTS, replaceEvents } from '@afriff/core/data/events'
import { COLLECTIONS, type FormValues } from '../app/lib/schema'
import { fieldProblem, formProblems } from '../app/lib/checks'
import type { Refs } from '../app/lib/types'

describe('names', () => {
  it('takes names in any language, with spaces, hyphens and apostrophes', () => {
    for (const n of ['Ada', 'Ìfẹ́ Ọlá', 'Adé-Bàbá', "O'Neil", 'N’Diaye', 'St. John', 'Zoë', 'Nkechi Ngozi']) assert.equal(nameProblem(n, 'first name'), null, n)
  })
  it('says what is wrong', () => {
    assert.match(nameProblem('  ', 'first name') ?? '', /Type your first name/)
    assert.match(nameProblem('Ada2', 'first name') ?? '', /numbers/)
    assert.match(nameProblem('<b>', 'last name') ?? '', /letters only/)
    assert.match(nameProblem('ada@x.com', 'last name') ?? '', /letters only/)
    assert.match(nameProblem('-Ada', 'first name') ?? '', /Start your first name with a letter/)
    assert.match(nameProblem('😀', 'name') ?? '', /letters only/)
    assert.match(nameProblem('a'.repeat(61), 'first name') ?? '', /too long/)
  })
})

describe('emails', () => {
  it('takes ordinary addresses', () => {
    for (const e of [' ada@example.com ', 'ada.obi+afriff@gmail.com', 'chidi@mail.afriff.com', 'tolu@école.fr']) assert.equal(emailProblem(e), null, e)
  })
  it('says what is wrong, specifically', () => {
    assert.match(emailProblem('') ?? '', /Type your email/)
    assert.match(emailProblem('ada obi@gmail.com') ?? '', /spaces/)
    assert.match(emailProblem('ada.gmail.com') ?? '', /needs an @/)
    assert.match(emailProblem('ada@@gmail.com') ?? '', /only one @/)
    assert.match(emailProblem('@gmail.com') ?? '', /before the @/)
    assert.match(emailProblem('ada@') ?? '', /after the @/)
    assert.match(emailProblem('ada@gmail') ?? '', /Finish the part after the @/)
    assert.match(emailProblem('ada..obi@gmail.com') ?? '', /dots/)
    assert.match(emailProblem('ada@gmail..com') ?? '', /dots/)
    assert.match(emailProblem('ad(a)@gmail.com') ?? '', /characters/)
    assert.match(emailProblem('ada@gmail.c') ?? '', /end of your email/)
    assert.match(emailProblem('ada@gmail.c0m') ?? '', /end of your email/)
    assert.match(emailProblem(`${'a'.repeat(65)}@gmail.com`) ?? '', /too long/)
  })
  it('suggests a fix for typos in well-known providers, and only then', () => {
    assert.equal(emailSuggestion('ada@gmial.com'), 'ada@gmail.com')
    assert.equal(emailSuggestion('ada@gmail.con'), 'ada@gmail.com')
    assert.equal(emailSuggestion('ada@gmail.co'), 'ada@gmail.com')
    assert.equal(emailSuggestion('ada@gmail'), 'ada@gmail.com')
    assert.equal(emailSuggestion('ada@yaho.com'), 'ada@yahoo.com')
    assert.equal(emailSuggestion('ada@yaho.co.uk'), 'ada@yahoo.co.uk')
    assert.equal(emailSuggestion('ada@hotmial.com'), 'ada@hotmail.com')
    assert.equal(emailSuggestion('Ada.Obi@Outlok.com'), 'Ada.Obi@outlook.com')
    for (const fine of ['ada@gmail.com', 'ada@yahoo.de', 'ada@company.co', 'ada@me.com', 'ada@mw.com', 'ada@afriff.com', 'ada@filmhouse.ng', 'not an email']) {
      assert.equal(emailSuggestion(fine), null, fine)
    }
  })
})

describe('new passwords', () => {
  it('at least 8 characters, at most 128', () => {
    assert.match(passwordProblem('') ?? '', /Choose a password/)
    assert.match(passwordProblem('Ab!defg') ?? '', /at least 8/)
    assert.match(passwordProblem(`Ab!${'q'.repeat(126)}`) ?? '', /too long/)
  })
  it('needs an uppercase letter, a lowercase letter and a special character, and says which are missing', () => {
    assert.equal(passwordProblem('jollof-rice-sunday'), 'Add an uppercase letter.')
    assert.equal(passwordProblem('JOLLOF-RICE'), 'Add a lowercase letter.')
    assert.equal(passwordProblem('JollofRice'), 'Add a special character (like ! or #).')
    assert.equal(passwordProblem('jollofrice'), 'Add an uppercase letter and a special character (like ! or #).')
    assert.equal(passwordProblem('12345678'), 'Add an uppercase letter, a lowercase letter and a special character (like ! or #).')
    assert.equal(passwordProblem('jollof rice sunday'), 'Add an uppercase letter and a special character (like ! or #).') // a space isn't a special character
  })
  it('accepts any password that meets those rules (no other rules)', () => {
    for (const p of ['Password1!', 'Jollof-rice', 'Ìfẹ́#Lagos', 'Chidi2026!', ' Mango&Kola ', 'Tf8$wq2Lz']) assert.equal(passwordProblem(p), null, p)
  })
  it('the second box must match', () => {
    assert.match(confirmProblem('Jollof-rice', '') ?? '', /again/)
    assert.match(confirmProblem('Jollof-rice', 'Jollof-Rice') ?? '', /don’t match/)
    assert.equal(confirmProblem('Jollof-rice', 'Jollof-rice'), null)
  })
})

describe('links phones accept', () => {
  it('web links: http(s) pages only', () => {
    assert.equal(webLink('https://afriff.com/tickets'), 'https://afriff.com/tickets')
    assert.equal(webLink(' http://example.com '), 'http://example.com')
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>x</script>', 'afriff.com', 'https://afriff', 'https://a b.com', 'file:///etc/passwd', 'mailto:x@y.com', 42, null]) {
      assert.equal(webLink(bad), '', String(bad))
    }
  })
  it('images: https, or a file shipped with the app', () => {
    assert.equal(imageLink('/masterclasses/acting-rmd.jpg'), '/masterclasses/acting-rmd.jpg')
    assert.equal(imageLink('https://afriff.com/__l5e/assets-v1/x.jpg'), 'https://afriff.com/__l5e/assets-v1/x.jpg')
    for (const bad of ['http://afriff.com/x.jpg', '//evil.com/x.jpg', '/../secret', 'javascript:alert(1)']) assert.equal(imageLink(bad), '', bad)
  })
  it('trailers: YouTube or Vimeo only', () => {
    for (const ok of ['https://www.youtube.com/watch?v=abc', 'https://youtu.be/abc', 'https://vimeo.com/123', 'https://player.vimeo.com/video/1']) assert.equal(videoLink(ok), ok)
    for (const bad of ['https://drive.google.com/file/d/1', 'https://mega.nz/x', 'https://notyoutube.com/x', 'javascript:alert(1)']) assert.equal(videoLink(bad), '', bad)
  })
  it('published data with a bad link reaches phones without it', () => {
    replaceProgramme({
      version: 1,
      venues: [{ id: 'v1', name: 'Filmhouse', address: 'Lekki', color: '#3CCFB8' }],
      films: [{ id: 'f1', title: 'Lady', image: 'javascript:alert(1)', trailer: 'https://drive.google.com/file/d/1' }],
      news: [{ id: 'n1', title: 'Hi', body: 'x', time: '2026-10-27T10:00:00Z', url: 'javascript:alert(1)' }],
      sponsors: [{ name: 'MTN', logo: 'http://x.com/logo.png', website: 'javascript:alert(1)' }],
      howToAttend: [{ id: 'h1', title: 'Tickets', body: 'x', link: { label: 'Buy', url: 'javascript:alert(1)' } }],
    } as never)
    assert.equal(FILMS[0]!.image, '')
    assert.equal(FILMS[0]!.trailer, '')
    assert.equal(NEWS[0]!.url, '')
    assert.equal(SPONSORS[0]!.website, '')
    assert.equal(SPONSORS[0]!.logo, '')
    assert.equal(HOW_TO_ATTEND[0]!.link, undefined)
    replaceEvents([{ id: 'e1', title: 'Gala', date: '2026-11-01', time: '19:00', link: { label: 'Go', url: 'javascript:alert(1)' }, image: '/masterclasses/a.jpg' }], new Set())
    assert.equal(EVENTS[0]!.link, undefined)
    assert.equal(EVENTS[0]!.image, '/masterclasses/a.jpg')
  })
})

describe('console forms', () => {
  const refs = { films: { lady: { id: 'lady' } }, venues: { landmark: { id: 'landmark' } } } as unknown as Refs
  const film: FormValues = { title: 'Lady', director: 'Olive Nwosu', section: 'Opening Movie', runtime: '90', year: '2025', image: 'https://afriff.com/p.jpg', trailer: 'https://youtu.be/x' }
  const field = (col: keyof typeof COLLECTIONS, key: string) => COLLECTIONS[col].fields.find((f) => f.key === key)!

  it('a good film has no problems', () => {
    assert.deepEqual(formProblems('films', film, refs), {})
  })
  it('required fields, numbers and links', () => {
    const p = formProblems('films', { ...film, title: '  ', runtime: '90.5', year: '1700', image: 'http://afriff.com/p.jpg', trailer: 'https://drive.google.com/x', section: 'Made up' }, refs)
    assert.match(p.title ?? '', /Fill this in/)
    assert.match(p.runtime ?? '', /whole number/)
    assert.match(p.year ?? '', /from 1895 to 2027/)
    assert.match(p.image ?? '', /https:\/\/ version/)
    assert.match(p.trailer ?? '', /YouTube or Vimeo/)
    assert.match(p.section ?? '', /Choose one of the options/)
    assert.match(fieldProblem('films', field('films', 'runtime'), { runtime: 90 } as never, refs) ?? 'none', /none/) // number boxes hand back numbers
    assert.match(fieldProblem('films', field('films', 'title'), { title: 'x'.repeat(151) }, refs) ?? '', /Too long: 151 characters \(150 at most\)/)
  })
  it('screenings: a deleted film, seats, times', () => {
    const p = formProblems('screenings', { film: 'gone', venue: 'landmark', screen: 'Screen 1', date: '2026-11-02', time: '25:00', tag: 'Public', capacity: '0' }, refs)
    assert.match(p.film ?? '', /deleted/)
    assert.match(p.time ?? '', /like 18:30/)
    assert.match(p.capacity ?? '', /from 1 to 5000/)
    assert.match(formProblems('screenings', { venue: 'landmark' }, refs).date ?? '', /Choose one/)
  })
  it('events: days in order, end time, button text and link together', () => {
    const base: FormValues = { type: 'masterclass', title: 'Acting', date: '2026-11-03', time: '10:00', end: '12:00', about: 'x' }
    assert.deepEqual(formProblems('events', base, refs), {})
    assert.match(formProblems('events', { ...base, endDate: '2026-11-02' }, refs).endDate ?? '', /after the first day/)
    assert.match(formProblems('events', { ...base, endDate: '2026-11-03' }, refs).endDate ?? '', /one-day event/)
    assert.match(formProblems('events', { ...base, end: '10:00' }, refs).end ?? '', /different/)
    assert.equal(formProblems('events', { ...base, end: '02:00' }, refs).end, undefined) // after midnight is fine
    assert.match(formProblems('events', { ...base, 'link.url': 'https://afriff.com' }, refs)['link.label'] ?? '', /button text/)
    assert.match(formProblems('events', { ...base, 'link.label': 'Register' }, refs)['link.url'] ?? '', /link this button opens/)
    assert.match(formProblems('events', { ...base, 'link.label': 'Register', 'link.url': 'javascript:alert(1)' }, refs)['link.url'] ?? '', /https:\/\//)
  })
  it('news: the banner end must come after the item', () => {
    const news: FormValues = { title: 'Venue change', body: 'Moved', time: '2026-11-02T10:00' }
    assert.deepEqual(formProblems('news', news, refs), {})
    assert.match(formProblems('news', { ...news, until: '2026-11-02T09:00' }, refs).until ?? '', /never shows/)
    assert.match(formProblems('news', { ...news, url: 'afriff.com' }, refs).url ?? '', /full link/)
  })
  it('venues: colour', () => {
    assert.match(formProblems('venues', { name: 'X', address: 'Y', color: 'teal' }, refs).color ?? '', /#3CCFB8/)
  })
})
