// How the console's search boxes match (app/lib/search.ts).
// Run: npm run test:accounts (from the main folder).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fold, matchesSearch, searchWords } from '../app/lib/search'
import { COLLECTIONS } from '../app/lib/schema'
import type { Refs } from '../app/lib/types'

const finds = (query: string, ...texts: unknown[]) => matchesSearch(searchWords(query), ...texts)

describe('console search', () => {
  it('ignores capitals and accents, including Yoruba tone marks and dots', () => {
    assert.equal(fold('Ìfẹ́ àti Ikú'), 'ife ati iku')
    assert.equal(fold('Adébáyọ̀ ỌLÁ'), 'adebayo ola')
    assert.ok(finds('ife ati iku', 'Ìfẹ́ àti Ikú (Love and Death)'))
    assert.ok(finds('ÌFẸ́', 'ife ati iku'))
    assert.ok(finds('adebayo', 'Femi Adébáyọ̀'))
  })
  it('matches every word anywhere, in any order', () => {
    assert.ok(finds('landmark lady', 'Lady', 'Sun 1 Nov · 7:00 PM · Filmhouse Landmark'))
    assert.ok(!finds('lady palms', 'Lady', 'Filmhouse Landmark'))
    assert.ok(finds('ada gmail', 'Ada', 'Obi', 'ada.obi@gmail.com'))
  })
  it('shows everything for an empty box, and skips empty or missing fields', () => {
    assert.deepEqual(searchWords('   '), [])
    assert.ok(finds('', 'anything'))
    assert.ok(finds('vip', null, undefined, '', ['Gala VIPs', 'Press']))
    assert.ok(!finds('null', null, undefined))
  })
  it('finds films by country, genre and cast, and events by room', () => {
    const refs = {} as Refs
    const text = (col: keyof typeof COLLECTIONS, d: Record<string, unknown>) => {
      const c = COLLECTIONS[col]
      return [c.label(d, refs), c.sub(d, refs), ...(c.searchAlso?.(d, refs) ?? [])]
    }
    const film = { title: 'Lady', director: 'Olive Nwosu', section: 'Opening Movie', country: 'Nigeria', genre: 'Drama', cast: 'Jessica Gabriel' }
    for (const q of ['lady', 'nwosu', 'nigeria drama', 'gabriel', 'opening']) assert.ok(matchesSearch(searchWords(q), ...text('films', film)), q)
    const event = { title: 'Acting Masterclass', type: 'masterclass', speaker: 'RMD', speakerRole: 'Actor', place: 'Masterclass room' }
    assert.ok(matchesSearch(searchWords('masterclass room actor'), ...text('events', event)))
  })
})
