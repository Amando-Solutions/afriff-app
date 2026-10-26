import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanFilm, type AfriffFilm } from '../src/afriff/films'
import { BASELINE_DOC, FILMS_PAGE, SCHEDULE_PAGE, STATUS_DOC } from '../src/config'
import { newFilmDoc } from '../src/sync/plan'
import { runSync, type Baseline, type SyncStatus } from '../src/sync/run'
import { memoryStore, type Data, type Store } from '../src/sync/store'
import { fakeSite, sampleFilms, schedulePage } from './fixtures'

const SECTIONS = { OPEN: 'Opening Movie', FEAT: 'Features', SHORTS: 'Shorts', OOC: 'Out of Competition' }
let clock = 1_000
const now = () => (clock += 1_000)

/** Our database as it might be today: the films already imported, minus one */
function seededStore(films: AfriffFilm[]) {
  const docs: Record<string, Data> = {}
  for (const f of films.slice(1)) docs[`films/${f.slug}`] = newFilmDoc(f.slug, cleanFilm(f, SECTIONS))
  return memoryStore(docs)
}
const film = (store: ReturnType<typeof memoryStore>, id: string) => store.docs.get(`films/${id}`)?.data
const status = async (store: Store) => (await store.get(STATUS_DOC)) as unknown as SyncStatus
const changes = (store: ReturnType<typeof memoryStore>): (Data & { id: string })[] =>
  [...store.docs].filter(([p]) => p.startsWith('changes/')).map(([p, d]) => ({ ...d.data, id: p.slice(8) }))
const runs = (store: ReturnType<typeof memoryStore>) => [...store.docs].filter(([p]) => p.startsWith('syncRuns/')).map(([, d]) => d.data)
/** afriff.com's films with some changed */
const edited = (films: AfriffFilm[], patch: Record<string, Partial<AfriffFilm>>) => films.map((f) => ({ ...f, ...patch[f.slug] }))

test('a whole season of checks', async (t) => {
  let films = sampleFilms()
  const store = seededStore(films)

  await t.test('first check: adds the missing film, changes nothing else, learns afriff.com', async () => {
    const site = fakeSite(films, 'film-selection-test-AAAA1111.js')
    const r = await runSync({ store, fetcher: site.fetcher, now })
    assert.deepEqual([r.result, r.added, r.updated, r.proposed], ['updated', 1, 0, 0])
    assert.equal(film(store, 'lady')?.title, 'Lady', 'ALL-CAPS title tidied')
    assert.equal(film(store, 'lady')?.trailer, 'https://www.youtube.com/watch?v=abc')
    const s = await status(store)
    assert.equal(s.filmsFile, 'https://afriff.com/assets/film-selection-test-AAAA1111.js')
    assert.equal(s.filmCount, 24)
    assert.deepEqual(s.lastChange?.films, ['Lady'])
    assert.equal(s.schedule?.timesListed, false)
    assert.ok(((await store.get(BASELINE_DOC)) as unknown as Baseline).films['film-9'])
    assert.equal(runs(store).length, 1)
  })

  await t.test('same file next time: only the two pages are downloaded, nothing changes', async () => {
    const site = fakeSite(films, 'film-selection-test-AAAA1111.js')
    const before = structuredClone([...store.docs].filter(([p]) => p.startsWith('films/')))
    const r = await runSync({ store, fetcher: site.fetcher, now })
    assert.equal(r.result, 'unchanged')
    assert.deepEqual(site.hits.sort(), [FILMS_PAGE, SCHEDULE_PAGE].sort())
    assert.deepEqual([...store.docs].filter(([p]) => p.startsWith('films/')), before)
    assert.equal((await status(store)).result, 'unchanged')
  })

  await t.test('afriff.com changes films: untouched fields follow, team edits go to Approvals', async () => {
    // the team rewrites Lady's synopsis and fixes a director in the console
    film(store, 'lady')!.synopsis = 'Our own synopsis.'
    films = edited(films, {
      lady: { synopsis: 'Official synopsis from AFRIFF.' },
      'film-4': { synopsis: 'Better synopsis 4.', runtime: 101 },
    })
    films.push({ slug: 'brand-new', title: 'BRAND NEW', programme: 'OOC', directors: ['Someone New'], poster: '/__l5e/assets-v1/ddd/new.jpg' })
    const r = await runSync({ store, fetcher: fakeSite(films, 'film-selection-test-BBBB2222.js').fetcher, now })
    assert.deepEqual([r.result, r.updated, r.added, r.proposed], ['updated', 1, 1, 1])
    assert.equal(film(store, 'film-4')?.synopsis, 'Better synopsis 4.')
    assert.equal(film(store, 'film-4')?.runtime, 101)
    assert.equal(film(store, 'lady')?.synopsis, 'Our own synopsis.', 'team edit kept')
    assert.equal(film(store, 'brand-new')?.title, 'Brand New')
    assert.equal(film(store, 'brand-new')?.image, 'https://afriff.com/__l5e/assets-v1/ddd/new.jpg')
    const [ch] = changes(store)
    assert.equal(ch?.status, 'pending')
    assert.equal(ch?.summary, 'afriff.com changed the synopsis of “Lady”')
    assert.deepEqual(ch?.fields, ['synopsis'])
    assert.equal((ch?.data as Data).synopsis, 'Official synopsis from AFRIFF.')
    assert.equal((ch?.before as Data).synopsis, 'Our own synopsis.')
    assert.equal(ch?.submittedBy, 'afriff-sync')
    assert.ok((ch?.submittedAt as { seconds: number }).seconds, 'stamped with the database clock')
    const log = runs(store).at(-1)!
    assert.deepEqual(log.updated, [{ id: 'film-4', after: { runtime: 101, synopsis: 'Better synopsis 4.' }, before: { runtime: 90, synopsis: 'Synopsis 4.' } }])
    assert.deepEqual(log.added, ['brand-new'])
  })

  await t.test('another afriff.com change to the same edited film joins the proposal still waiting', async () => {
    film(store, 'lady')!.title = 'Lady (team title)'
    films = edited(films, { lady: { title: 'Lady: The Film' } })
    await runSync({ store, fetcher: fakeSite(films, 'film-selection-test-CCCC3333.js').fetcher, now })
    const all = changes(store)
    assert.equal(all.length, 1, 'still one proposal for Lady')
    assert.deepEqual(new Set(all[0]!.fields as string[]), new Set(['title', 'synopsis']))
    assert.equal(all[0]!.summary, 'afriff.com changed the title and synopsis of “Lady (team title)”')
    assert.equal((all[0]!.data as Data).title, 'Lady: The Film')
    assert.equal((all[0]!.data as Data).synopsis, 'Official synopsis from AFRIFF.')
  })

  await t.test('once that proposal is rejected, the next afriff.com change makes a new one', async () => {
    const [old] = changes(store)
    store.docs.get(`changes/${old!.id}`)!.data.status = 'rejected'
    films = edited(films, { lady: { synopsis: 'Official synopsis, take two.' } })
    await runSync({ store, fetcher: fakeSite(films, 'film-selection-test-DDDD4444.js').fetcher, now })
    const pending = changes(store).filter((c) => c.status === 'pending')
    assert.equal(pending.length, 1)
    assert.notEqual(pending[0]!.id, old!.id)
    assert.deepEqual(pending[0]!.fields, ['synopsis'])
  })

  await t.test('a broken film list changes nothing and is tried again next time', async () => {
    const goodFile = (await status(store)).filmsFile
    const before = structuredClone(film(store, 'film-5'))
    await assert.rejects(runSync({ store, fetcher: fakeSite(films.slice(0, 5), 'film-selection-test-EEEE5555.js').fetcher, now }), /looks broken/)
    const s = await status(store)
    assert.equal(s.result, 'error')
    assert.match(s.error, /only 5 films/)
    assert.equal(s.filmsFile, goodFile, 'last good file kept')
    assert.deepEqual(film(store, 'film-5'), before)
    // afriff.com fixes it under the same name: processed this time
    const r = await runSync({ store, fetcher: fakeSite(films, 'film-selection-test-EEEE5555.js').fetcher, now })
    assert.equal(r.result, 'nothing-new')
    assert.equal((await status(store)).error, '')
  })

  await t.test('a film edited while the sync saves: nothing saved, the next check applies it', async () => {
    films = edited(films, { 'film-5': { synopsis: 'New synopsis 5.' } })
    const site = fakeSite(films, 'film-selection-test-FFFF6666.js')
    // someone saves film-5 in the console between the sync's read and its write
    const racing: Store = { ...store, commit: async (w) => { if (w.length > 1) store.docs.get('films/film-5')!.version += 1; return store.commit(w) } }
    await assert.rejects(runSync({ store: racing, fetcher: site.fetcher, now }), /edited while the sync was saving/)
    assert.equal(film(store, 'film-5')?.synopsis, 'Synopsis 5.')
    await runSync({ store, fetcher: site.fetcher, now })
    assert.equal(film(store, 'film-5')?.synopsis, 'New synopsis 5.')
  })

  await t.test('the schedule page starting to list times, and new kinds of film details, are noticed', async () => {
    films = edited(films, { lady: { screenings: [{ date: '2026-11-01', time: '19:00' }] } })
    const site = fakeSite(films, 'film-selection-test-GGGG7777.js', schedulePage('SUN 01 Lady 7:00 PM Landmark. MON 02 Abeni 12:30 PM. Hadda 3:00 PM'))
    const t0 = clock
    await runSync({ store, fetcher: site.fetcher, now })
    const s = await status(store)
    assert.equal(s.schedule?.timesListed, true)
    assert.ok((s.schedule?.changedAt ?? 0) > t0)
    assert.deepEqual(s.newFields, ['screenings'])
  })
})
