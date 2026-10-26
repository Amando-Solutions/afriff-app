import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanFilm, cleanList, findFilmsAndSections, joinNames, posterLink, tidyName, tidyTitle, trailerLink } from '../src/afriff/films'
import { moduleExports } from '../src/afriff/sandbox'
import { findFilmListFile, checkSchedulePage, scriptLinks } from '../src/afriff/site'
import { dataFile, programPage, sampleFilms, schedulePage } from './fixtures'

test('ALL-CAPS titles get normal capitals; others are left alone', () => {
  assert.equal(tidyTitle('LADY'), 'Lady')
  assert.equal(tidyTitle('THE OTHER GAZE'), 'The Other Gaze')
  assert.equal(tidyTitle('A TRAY OF LOCUST BEANS'), 'A Tray of Locust Beans')
  assert.equal(tidyTitle('Ìfẹ́ àti Ikú (LOVE AND DEATH)'), 'Ìfẹ́ àti Ikú (LOVE AND DEATH)')
  assert.equal(tidyTitle('GOAT'), 'Goat')
  assert.equal(tidyTitle('  Rain '), 'Rain')
})

test('names in all capitals or all lower case get normal capitals', () => {
  assert.equal(tidyName('VINCHO NCHOGU'), 'Vincho Nchogu')
  assert.equal(tidyName('uzee usman'), 'Uzee Usman')
  assert.equal(tidyName("NORNG'ARUANI KIPUKER"), "Norng'Aruani Kipuker")
  assert.equal(tidyName('Milad.shiri'), 'Milad.shiri')
  assert.equal(joinNames(['A One', 'B Two']), 'A One & B Two')
  assert.equal(joinNames(['A', 'B', 'C', 'a']), 'A, B & C')
})

test('only YouTube and Vimeo links count as trailers', () => {
  assert.equal(trailerLink('https://www.youtube.com/watch?v=abc'), 'https://www.youtube.com/watch?v=abc')
  assert.equal(trailerLink('https://youtu.be/abc'), 'https://youtu.be/abc')
  assert.equal(trailerLink('https://vimeo.com/123/abc'), 'https://vimeo.com/123/abc')
  assert.equal(trailerLink('https://drive.google.com/file/d/x/view'), '')
  assert.equal(trailerLink('https://mega.nz/folder/x'), '')
  assert.equal(trailerLink('http://youtu.be/abc'), '')
  assert.equal(trailerLink('not a link'), '')
})

test('poster paths become full afriff.com links', () => {
  assert.equal(posterLink('/__l5e/assets-v1/a/b.jpg'), 'https://afriff.com/__l5e/assets-v1/a/b.jpg')
  assert.equal(posterLink('https://afriff-revival.lovable.app/__l5e/x.jpg'), 'https://afriff.com/__l5e/x.jpg')
  assert.equal(posterLink('https://m.media-amazon.com/images/M/x.jpg'), 'https://m.media-amazon.com/images/M/x.jpg')
  assert.equal(posterLink('javascript:alert(1)'), '')
  assert.equal(posterLink(''), '')
})

test('a film is cleaned into our fields', () => {
  const v = cleanFilm(sampleFilms()[0]!, { OPEN: 'Opening Movie' })
  assert.deepEqual(v, {
    title: 'Lady', section: 'Opening Movie', director: 'Olive Nwosu', country: 'United Kingdom, Nigeria',
    language: 'English', genre: 'Drama', runtime: 93, year: 2026, synopsis: 'A Lagos cab driver.',
    cast: 'Ada One, Bola Two', image: 'https://afriff.com/__l5e/assets-v1/aaa/lady.jpg', trailer: 'https://www.youtube.com/watch?v=abc',
  })
  const d = cleanFilm(sampleFilms()[2]!, { FEAT: 'Features' })
  assert.equal(d.country, '')
  assert.equal(d.trailer, '')
  assert.equal(d.director, 'A & B')
  assert.equal(cleanFilm({ slug: 'x', title: 'X', synopsis: 'Synopsis coming soon.' }, {}).synopsis, '')
})

test('a duplicate listing only fills gaps in its main film', async () => {
  const films = [...sampleFilms(), { slug: 'ife-ati-iku', title: 'Ife Ati Iku', programme: 'OOC', directors: ['Someone Else'], poster: '/__l5e/p.jpg' },
    { slug: 'ife-ati-iku-love-and-death', title: 'Ìfẹ́ àti Ikú (Love and Death)', programme: 'SHORTS', directors: ['Favour Babalola'] }]
  const { films: list, sections } = findFilmsAndSections(await moduleExports(dataFile(films)))
  const src = cleanList(list, sections)
  const main = src.films.get('ife-ati-iku-love-and-death')!
  assert.equal(src.films.has('ife-ati-iku'), false)
  assert.equal(main.section, 'Shorts')
  assert.equal(main.director, 'Favour Babalola')
  assert.equal(main.image, 'https://afriff.com/__l5e/p.jpg')
})

test('the film list and section names are found among the exports', async () => {
  const { films, sections } = findFilmsAndSections(await moduleExports(dataFile(sampleFilms())))
  assert.equal(films.length, 24)
  assert.deepEqual(sections, { OPEN: 'Opening Movie', FEAT: 'Features', SHORTS: 'Shorts', OOC: 'Out of Competition' })
})

test('finds the film list file from the /program page', async () => {
  assert.deepEqual(scriptLinks(programPage('film-selection-test-C2TypRWh.js')), [
    'https://afriff.com/assets/index-Zz9Yy8Xx.js', 'https://afriff.com/assets/film-selection-test-C2TypRWh.js',
  ])
  const found = await findFilmListFile(async () => '', programPage('film-selection-test-C2TypRWh.js'))
  assert.equal(found.url, 'https://afriff.com/assets/film-selection-test-C2TypRWh.js')
  // renamed file: found by looking inside the linked files
  const renamed = programPage('catalogue-Q1w2E3r4.js')
  const got = await findFilmListFile(async (url) => (url.endsWith('catalogue-Q1w2E3r4.js') ? dataFile(sampleFilms()) : 'export{}'), renamed)
  assert.equal(got.url, 'https://afriff.com/assets/catalogue-Q1w2E3r4.js')
  assert.ok(got.code)
  await assert.rejects(findFilmListFile(async () => 'export{}', renamed), /Couldn't find the film list/)
})

test('notices when the schedule page starts listing times', () => {
  const before = checkSchedulePage(schedulePage())
  assert.equal(before.timesListed, false)
  // same words, different code around them: same fingerprint
  assert.equal(checkSchedulePage(schedulePage()).signature, before.signature)
  const after = checkSchedulePage(schedulePage('Schedule. SUN 01 Lady 7:00 PM Landmark. MON 02 Abeni 12:30 PM, Hadda 3:00 PM'))
  assert.equal(after.timesListed, true)
  assert.notEqual(after.signature, before.signature)
})
