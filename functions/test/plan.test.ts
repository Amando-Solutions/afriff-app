import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FilmValues } from '../src/afriff/films'
import { newFilmDoc, planSync, same, type DbFilm } from '../src/sync/plan'

const values = (v: FilmValues = {}): FilmValues => ({
  title: 'Lady', section: 'Opening Movie', director: 'Olive Nwosu', country: 'Nigeria', language: 'English', genre: 'Drama',
  runtime: 93, year: 2026, synopsis: 'A Lagos cab driver.', cast: '', image: 'https://afriff.com/a.jpg', trailer: '', ...v,
})
const dbFilm = (v: FilmValues = {}, extra: DbFilm = {}): DbFilm => ({ ...values(v), premiere: '', competition: true, poster: { style: 'glow', a: '#000', b: '#fff' }, ...extra })
const src = (entries: [string, FilmValues][]) => new Map(entries)
const db = (entries: [string, DbFilm][]) => new Map(entries)

test('same(): empty values are all alike, text is compared trimmed, numbers match their text', () => {
  assert.ok(same('', null) && same(undefined, 0) && same(null, ''))
  assert.ok(same(' Lady ', 'Lady') && same(93, '93'))
  assert.ok(!same('', 'x') && !same('Lady', 'lady'))
})

test('first check: changes nothing on existing films, adds new ones, remembers everything', () => {
  const plan = planSync(
    src([['lady', values({ title: 'LADY (afriff spelling)' })], ['new-film', values({ title: 'New Film', runtime: null, year: null })]]),
    db([['lady', dbFilm()]]),
    null,
  )
  assert.equal(plan.firstRun, true)
  assert.deepEqual(plan.updates, [])
  assert.deepEqual(plan.proposals, [])
  assert.deepEqual(plan.creates.map((c) => c.id), ['new-film'])
  assert.deepEqual(Object.keys(plan.baseline).sort(), ['lady', 'new-film'])
})

test('afriff.com changes a field nobody here touched: we take it', () => {
  const plan = planSync(src([['lady', values({ synopsis: 'Official synopsis.' })]]), db([['lady', dbFilm()]]), { lady: values() })
  assert.deepEqual(plan.updates, [{ id: 'lady', set: { synopsis: 'Official synopsis.' }, before: { synopsis: 'A Lagos cab driver.' } }])
  assert.deepEqual(plan.proposals, [])
})

test('afriff.com changes a field the team edited: proposed for approval, not written', () => {
  const plan = planSync(
    src([['lady', values({ synopsis: 'Official synopsis.' })]]),
    db([['lady', dbFilm({ synopsis: 'Our own synopsis.' })]]),
    { lady: values() },
  )
  assert.deepEqual(plan.updates, [])
  assert.deepEqual(plan.proposals, [{ id: 'lady', values: { synopsis: 'Official synopsis.' }, before: { synopsis: 'Our own synopsis.' } }])
})

test('afriff.com unchanged but we differ: the team’s edit stands, nothing proposed', () => {
  const plan = planSync(src([['lady', values({ director: 'OLIVE NWOSU' })]]), db([['lady', dbFilm()]]), { lady: values({ director: 'OLIVE NWOSU' }) })
  assert.deepEqual([plan.updates, plan.proposals], [[], []])
})

test('afriff.com changes to what we already have: nothing to do', () => {
  const plan = planSync(src([['lady', values({ title: 'Lady' })]]), db([['lady', dbFilm()]]), { lady: values({ title: 'LADY!' }) })
  assert.deepEqual([plan.updates, plan.proposals], [[], []])
})

test('afriff.com empties a field: ours is kept', () => {
  const plan = planSync(src([['lady', values({ image: '' })]]), db([['lady', dbFilm()]]), { lady: values() })
  assert.deepEqual(plan.updates, [])
  assert.deepEqual(plan.kept, [{ id: 'lady', field: 'image' }])
  assert.equal(plan.baseline.lady!.image, '')
})

test('afriff.com fills a field we both had empty: we take it', () => {
  const plan = planSync(src([['lady', values({ cast: 'Jessica Gabriel’s Ujah' })]]), db([['lady', dbFilm()]]), { lady: values() })
  assert.deepEqual(plan.updates[0]?.set, { cast: 'Jessica Gabriel’s Ujah' })
})

test('a field cleared on purpose by the team (e.g. a private trailer) is never put back', () => {
  const was = values({ trailer: 'https://vimeo.com/1' })
  // first afriff.com changes something else: the trailer stays empty here
  const plan = planSync(src([['lady', values({ trailer: 'https://vimeo.com/1', year: 2025 })]]), db([['lady', dbFilm({ trailer: '' })]]), { lady: was })
  assert.deepEqual(plan.updates[0]?.set, { year: 2025 })
  // then afriff.com swaps the trailer link: proposed, not written
  const later = planSync(src([['lady', values({ trailer: 'https://vimeo.com/2' })]]), db([['lady', dbFilm({ trailer: '' })]]), { lady: was })
  assert.deepEqual(later.updates, [])
  assert.deepEqual(later.proposals[0]?.values, { trailer: 'https://vimeo.com/2' })
})

test('a film the team deleted is not added back; a film afriff.com dropped stays ours', () => {
  const plan = planSync(src([['gone-here', values()]]), db([['dropped', dbFilm()]]), { 'gone-here': values(), dropped: values() })
  assert.deepEqual(plan.creates, [])
  assert.deepEqual(plan.deletedHere, ['gone-here'])
  assert.deepEqual(plan.goneFromAfriff, ['dropped'])
  assert.ok(plan.baseline.dropped, 'still remembered')
})

test('a field we only just started syncing is learned, not written', () => {
  const { genre, ...older } = values()
  void genre
  const plan = planSync(src([['lady', values({ genre: 'Drama, Romance' })]]), db([['lady', dbFilm({ genre: '' })]]), { lady: older })
  assert.deepEqual([plan.updates, plan.proposals], [[], []])
})

test('several changes on one film: untouched ones written, edited ones proposed, together', () => {
  const plan = planSync(
    src([['lady', values({ synopsis: 'New.', title: 'Lady (2026)', runtime: 95 })]]),
    db([['lady', dbFilm({ title: 'Lady!' })]]),
    { lady: values() },
  )
  assert.deepEqual(plan.updates[0]?.set, { runtime: 95, synopsis: 'New.' })
  assert.deepEqual(plan.proposals[0]?.values, { title: 'Lady (2026)' })
})

test('a new film’s record has every field, placeholder poster colours and empty extras', () => {
  const doc = newFilmDoc('touch', { title: 'Touch', section: 'Out of Competition', director: 'Mohammad Davoodi Kia', runtime: null, year: null })
  assert.deepEqual(Object.keys(doc).sort(), ['cast', 'competition', 'country', 'director', 'genre', 'image', 'language', 'poster', 'premiere', 'runtime', 'section', 'synopsis', 'title', 'trailer', 'year'])
  assert.equal(doc.runtime, 0)
  assert.equal(doc.year, null)
  assert.equal(doc.competition, false)
  const poster = doc.poster as { style: string; a: string; b: string }
  assert.match(poster.style, /^(glow|stripes|split)$/)
  assert.deepEqual(newFilmDoc('touch', {}).poster, poster, 'same colours every time for the same film')
})
