// Alerts for changed screenings and events (shared/changeAlerts.ts): what the
// Publish page offers to post and push. Run: npm run test:accounts (from the main folder).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { alertFor, alertNews, changeAlerts } from '../shared/changeAlerts'
import { duePushes } from '../shared/push'

const names = {
  films: { lady: { title: 'Lady' }, eseuseu: { title: 'Eseuseu' } },
  venues: { landmark: { name: 'Filmhouse Landmark' }, twinwaters: { name: 'Filmhouse Twinwaters' } },
}
const LADY = { id: 's3', film: 'lady', venue: 'landmark', screen: 'Screen 1', date: '2026-11-01', time: '19:00', status: '' }
const ESE = { id: 's4', film: 'eseuseu', venue: 'landmark', screen: 'Screen 2', date: '2026-11-02', time: '15:00', status: '' }
const GALA = { id: 'gala', title: 'Opening Gala', venue: 'landmark', place: 'Main hall', date: '2026-11-01', time: '21:00', status: '' }
const published = { screenings: [LADY, ESE], events: [GALA], news: [{ id: 'n1', title: 'Times are samples' }] }

describe('alerts for changed screenings and events', () => {
  it('a screening moved to another venue (the user’s test on 27 Oct) gets a "moved" alert, pushed', () => {
    const next = { ...published, screenings: [{ ...LADY, venue: 'twinwaters', status: 'moved' }, ESE] }
    const [a, ...rest] = changeAlerts(published, next, names)
    assert.equal(rest.length, 0)
    assert.deepEqual(a, {
      itemId: 's3', col: 'screenings', type: 'venue-change', title: 'Lady moved',
      body: 'Lady is now at Filmhouse Twinwaters, Screen 1, Sun 1 Nov at 7:00 PM.',
    })
    const news = alertNews(a!, new Date('2026-10-27T13:00:00Z'))
    assert.equal(news.screening, 's3')
    assert.equal(news.push, true)
    assert.equal(news.urgent, true)
    // and the push rule sends it at the next publish
    assert.deepEqual(duePushes([{ id: 'alert-x', ...news }], new Set(), Date.parse('2026-10-27T13:00:00Z')).send.map((n) => n.title), ['Lady moved'])
  })

  it('marking it "moved" alone is enough (as published on 27 Oct: s3 moved, same venue)', () => {
    const next = { ...published, screenings: [{ ...LADY, status: 'moved' }, ESE] }
    assert.equal(changeAlerts(published, next, names)[0]?.title, 'Lady moved')
  })

  it('new times, cancellations and reinstated ones, for events too', () => {
    assert.deepEqual(alertFor('screenings', LADY, { ...LADY, time: '20:30' }, names), { type: 'time-change', title: 'Lady: new time', body: 'Lady is now Sun 1 Nov at 8:30 PM, Filmhouse Landmark, Screen 1.' })
    assert.equal(alertFor('screenings', LADY, { ...LADY, status: 'cancelled' }, names)?.title, 'Lady cancelled')
    assert.equal(alertFor('screenings', { ...LADY, status: 'cancelled' }, LADY, names)?.title, 'Lady is back on')
    assert.equal(alertFor('events', GALA, { ...GALA, place: 'Rooftop' }, names)?.body, 'Opening Gala is now at Filmhouse Landmark, Rooftop, Sun 1 Nov at 9:00 PM.')
  })

  it('nothing for changes attendees don’t need a push for (seats, Q&A), new or deleted items, or the first publish', () => {
    assert.deepEqual(changeAlerts(published, { ...published, screenings: [{ ...LADY, capacity: 300, qa: true }] }, names), [])
    assert.deepEqual(changeAlerts(published, { ...published, screenings: [LADY, ESE, { ...ESE, id: 's9', time: '10:00' }] }, names), [])
    assert.deepEqual(changeAlerts(null, published, names), [])
  })

  it('changed three times before a publish: one alert, for where it ends up; changed and changed back: none', () => {
    const next = { ...published, screenings: [{ ...LADY, time: '21:00' }, ESE] }
    assert.equal(changeAlerts(published, next, names).length, 1)
    assert.deepEqual(changeAlerts(published, { ...published, screenings: [{ ...LADY }, ESE] }, names), [])
  })

  it('left out when the team already posted its own alert for that item since the last publish', () => {
    const next = { ...published, screenings: [{ ...LADY, time: '21:00' }, { ...ESE, time: '16:00' }], news: [...published.news, { id: 'alert-own', title: 'Lady starts later', screening: 's3' }] }
    assert.deepEqual(changeAlerts(published, next, names).map((a) => a.itemId), ['s4'])
    // an alert from an earlier publish doesn't count
    const older = { ...published, news: [...published.news, { id: 'alert-old', screening: 's3' }] }
    assert.equal(changeAlerts(older, { ...older, screenings: [{ ...LADY, time: '21:00' }, ESE] }, names).length, 1)
  })
})
