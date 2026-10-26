// A dry run, from a laptop: `npm run check` (in functions/).
// Reads afriff.com and the app's last published copy (both public, no sign-in
// needed), and prints what afriff.com says, where it differs from us, and what
// the sync's first check would do. Writes nothing anywhere.

import { SYNCED_FIELDS } from './config'
import { cleanList, findFilmsAndSections, newSourceKeys } from './afriff/films'
import { moduleExports } from './afriff/sandbox'
import { FILMS_PAGE } from './config'
import { fetchSchedule, fetchText, findFilmListFile } from './afriff/site'
import { planSync, same, type DbFilm } from './sync/plan'

const PUBLISHED = 'https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents/published/current'
const short = (v: unknown) => {
  const s = v == null ? '' : String(v).replace(/\s+/g, ' ')
  return s.length > 70 ? `${s.slice(0, 67)}…` : s
}

const page = await fetchText(FILMS_PAGE)
const found = await findFilmListFile(fetchText, page)
const { films, sections } = findFilmsAndSections(await moduleExports(found.code ?? (await fetchText(found.url))))
const source = cleanList(films, sections)
const schedule = await fetchSchedule(fetchText)
console.log(`afriff.com film list: ${found.url}`)
console.log(`  ${films.length} listings → ${source.films.size} films, ${Object.keys(sections).length} sections${source.skipped.length ? `, skipped ${source.skipped.join(', ')}` : ''}`)
console.log(`  new field names: ${newSourceKeys(source.keys).join(', ') || 'none'}`)
console.log(`afriff.com schedule page: ${schedule.timesListed ? 'MAY NOW LIST TIMES' : 'no screening times yet'} (fingerprint ${schedule.signature})`)

const res = await fetch(PUBLISHED)
const ours = new Map<string, DbFilm>()
if (res.ok) {
  const doc = (await res.json()) as { fields: { json: { stringValue: string } } }
  for (const f of (JSON.parse(doc.fields.json.stringValue).films ?? []) as DbFilm[]) ours.set(String(f.id), f)
}
console.log(`\nOur published copy: ${ours.size} films`)

let diffs = 0
for (const [id, v] of source.films) {
  const o = ours.get(id)
  if (!o) continue
  for (const f of SYNCED_FIELDS) {
    if (same(o[f], v[f])) continue
    diffs += 1
    console.log(`  ${id} · ${f}: ours "${short(o[f])}"  afriff "${short(v[f])}"`)
  }
}
console.log(`${diffs} differences. The sync never overwrites these by itself: it only follows CHANGES afriff.com makes from now on.`)

const plan = planSync(source.films, ours, null)
console.log(`\nFirst check would: learn ${source.films.size} films, add ${plan.creates.length} new (${plan.creates.map((c) => c.id).join(', ') || 'none'}), change nothing else.`)
