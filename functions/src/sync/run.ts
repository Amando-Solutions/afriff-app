// One check of afriff.com (the scheduled function runs this every 15 minutes).
//
//  1. Download afriff.com/program and find the film list's file name.
//     Same name as last time → nothing changed: note the time, stop. (Cheap:
//     one page download, one tiny database read and write.)
//  2. New name → download it, read it in the sandbox, clean the films.
//     If it looks broken (too few films, missing titles), change nothing.
//  3. Compare with our films and the baseline (plan.ts), then save everything in
//     ONE all-or-nothing write: film updates, new films, proposals for
//     Approvals, the new baseline, the status the console shows, and a run log
//     with before/after values. If a film was edited while this ran, the save
//     is refused and the next check tries again.
//
// It never publishes: attendees see changes after an admin presses
// "Publish to app", like any other edit.

import {
  BASELINE_DOC, FIELD_WORDS, FILMS_PAGE, MIN_FILMS, MIN_SHARE_OF_LAST, RUNS_COLLECTION, STATUS_DOC, SYNC_USER, type SyncedField,
} from '../config'
import { cleanList, findFilmsAndSections, newSourceKeys, type FilmValues, type SourceList } from '../afriff/films'
import { moduleExports } from '../afriff/sandbox'
import { fetchSchedule, fetchText, findFilmListFile, type Fetcher } from '../afriff/site'
import { planSync, same, type DbFilm } from './plan'
import { SERVER_TIME, type Data, type Store, type Write } from './store'

/** sync/afriff: what the console's "afriff.com sync" card shows. Times are ms since 1970. */
export interface SyncStatus {
  version: 1
  checkedAt: number
  /** unchanged = same file as last time; learned = first check; updated = changed something; nothing-new = new file, nothing for us */
  result: 'unchanged' | 'learned' | 'updated' | 'nothing-new' | 'error'
  error: string
  filmsFile: string
  filmCount: number
  changedAt: number | null
  lastChange: { at: number; updated: number; added: number; proposed: number; films: string[] } | null
  schedule: { signature: string; timesListed: boolean; checkedAt: number; changedAt: number | null } | null
  /** field names afriff.com's films started using (maybe screening times) */
  newFields: string[]
  /** our films afriff.com used to list and doesn't any more */
  goneFromAfriff: string[]
}

/** sync/afriff-baseline: what afriff.com said last time (only the function reads it) */
export interface Baseline {
  films: Record<string, FilmValues>
  keys: string[]
  /** film id → its proposal still waiting in Approvals */
  open: Record<string, string>
  file: string
  savedAt: number
}

export interface RunResult {
  result: SyncStatus['result']
  file?: string
  updated: number
  added: number
  proposed: number
  message: string
}

const and = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
export const proposalSummary = (title: string, fields: string[]) =>
  `afriff.com changed the ${and(fields.map((f) => FIELD_WORDS[f as SyncedField] ?? f))} of “${title}”`

const errorText = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e)
  if (/precondition|changed by someone else|already exists/i.test(msg)) return 'A film was edited while the sync was saving, so nothing was saved. It tries again at the next check.'
  return msg
}

/** Refuse a film list that looks broken, so a bad day on afriff.com can't damage our data */
function checkLooksRight(source: SourceList, lastCount: number | undefined) {
  const n = source.films.size
  if (n < MIN_FILMS) throw new Error(`afriff.com's film list has only ${n} films, so it looks broken. Nothing was changed.`)
  if (lastCount && n < lastCount * MIN_SHARE_OF_LAST) throw new Error(`afriff.com's film list dropped from ${lastCount} to ${n} films, so it looks broken. Nothing was changed.`)
  const untitled = [...source.films.values()].filter((v) => !v.title).length
  if (untitled > n * 0.1) throw new Error(`${untitled} films on afriff.com have no title, so the list looks broken. Nothing was changed.`)
}

export async function runSync({ store, fetcher = fetchText, now = Date.now, force = false }: {
  store: Store
  fetcher?: Fetcher
  now?: () => number
  /** process the film list even if its file hasn't changed */
  force?: boolean
}): Promise<RunResult> {
  const t = now()
  const prev = (await store.get(STATUS_DOC)) as Partial<SyncStatus> | null
  let schedule = prev?.schedule ?? null
  try {
    const [page, sched] = await Promise.all([fetcher(FILMS_PAGE), fetchSchedule(fetcher).catch(() => null)])
    if (sched) {
      const changedAt = schedule && schedule.signature !== sched.signature ? t : (schedule?.changedAt ?? null)
      schedule = { ...sched, checkedAt: t, changedAt }
    }
    const found = await findFilmListFile(fetcher, page)

    // 1. nothing new on afriff.com
    if (!force && prev?.filmsFile === found.url) {
      await store.commit([{ kind: 'set', path: STATUS_DOC, merge: true, data: { version: 1, checkedAt: t, result: 'unchanged', error: '', schedule } }])
      return { result: 'unchanged', file: found.url, updated: 0, added: 0, proposed: 0, message: 'film list unchanged' }
    }

    // 2. read and clean the new film list
    const code = found.code ?? (await fetcher(found.url))
    const { films, sections } = findFilmsAndSections(await moduleExports(code))
    const source = cleanList(films, sections)
    checkLooksRight(source, prev?.filmCount)

    // 3. compare and save
    const baseline = (await store.get(BASELINE_DOC)) as Baseline | null
    const db = await store.list('films')
    const current = new Map<string, DbFilm>([...db].map(([id, d]) => [id, d.data]))
    const plan = planSync(source.films, current, baseline?.films ?? null)
    const open = { ...(baseline?.open ?? {}) }
    const writes: Write[] = []

    for (const u of plan.updates) writes.push({ kind: 'update', path: `films/${u.id}`, data: u.set as Data, version: db.get(u.id)!.version })
    for (const c of plan.creates) writes.push({ kind: 'create', path: `films/${c.id}`, data: c.doc })

    const proposed: { id: string; changeId: string; fields: string[] }[] = []
    for (const p of plan.proposals) {
      const cur = current.get(p.id)!
      const values: Data = { ...p.values }
      // one proposal per film: fold this into the one still waiting, if any
      let changeId = open[p.id]
      if (changeId) {
        const waiting = await store.get(`changes/${changeId}`)
        if (waiting?.status === 'pending' && Array.isArray(waiting.fields)) {
          const old = (waiting.data ?? {}) as Data
          for (const f of waiting.fields as string[]) if (!(f in values) && !same(cur[f], old[f])) values[f] = old[f]
        } else changeId = undefined
      }
      changeId ??= store.newId('changes')
      open[p.id] = changeId
      const fields = Object.keys(values)
      writes.push({
        kind: 'set', path: `changes/${changeId}`, data: {
          collection: 'films', docId: p.id, action: 'update', fields,
          data: { ...cur, ...values }, before: cur,
          summary: proposalSummary(String(cur.title || p.id), fields),
          status: 'pending', submittedBy: SYNC_USER.id, submittedByName: SYNC_USER.name, submittedAt: SERVER_TIME,
        },
      })
      proposed.push({ id: p.id, changeId, fields })
    }

    const changed = writes.length > 0
    const titleOf = (id: string) => String(current.get(id)?.title ?? plan.creates.find((c) => c.id === id)?.doc.title ?? id)
    const touched = [...new Set([...plan.creates.map((c) => c.id), ...plan.updates.map((u) => u.id), ...proposed.map((p) => p.id)])]
    const result: SyncStatus['result'] = changed ? 'updated' : plan.firstRun ? 'learned' : 'nothing-new'
    const status: SyncStatus = {
      version: 1, checkedAt: t, result, error: '', filmsFile: found.url, filmCount: source.films.size,
      changedAt: changed ? t : (prev?.changedAt ?? null),
      lastChange: changed
        ? { at: t, updated: plan.updates.length, added: plan.creates.length, proposed: proposed.length, films: touched.slice(0, 8).map(titleOf) }
        : (prev?.lastChange ?? null),
      schedule,
      newFields: newSourceKeys(source.keys),
      goneFromAfriff: plan.goneFromAfriff,
    }
    const nextBaseline: Baseline = { films: plan.baseline, keys: source.keys, open, file: found.url, savedAt: t }
    writes.push({ kind: 'set', path: BASELINE_DOC, data: nextBaseline as unknown as Data })
    writes.push({ kind: 'set', path: STATUS_DOC, data: status as unknown as Data })
    if (changed) {
      // what changed, with the values before, so any of it can be undone by hand
      let log: Data = {
        at: t, file: found.url, firstRun: plan.firstRun,
        updated: plan.updates.map((u) => ({ id: u.id, after: u.set, before: u.before })),
        added: plan.creates.map((c) => c.id), proposed, kept: plan.kept, deletedHere: plan.deletedHere,
      }
      if (JSON.stringify(log).length > 900_000) log = { ...log, updated: plan.updates.map((u) => ({ id: u.id, fields: Object.keys(u.set) })) }
      writes.push({ kind: 'set', path: `${RUNS_COLLECTION}/${store.newId(RUNS_COLLECTION)}`, data: log })
    }
    await store.commit(writes)

    const message = plan.firstRun && !changed
      ? `first check: learned ${source.films.size} films, changed nothing`
      : `${plan.updates.length} films updated, ${plan.creates.length} added, ${proposed.length} sent to Approvals`
    return { result, file: found.url, updated: plan.updates.length, added: plan.creates.length, proposed: proposed.length, message }
  } catch (e) {
    const error = errorText(e)
    // keep the last good file name, so the next check tries this one again
    await store.commit([{ kind: 'set', path: STATUS_DOC, merge: true, data: { version: 1, checkedAt: t, result: 'error', error, schedule } }]).catch(() => {})
    throw new Error(error, { cause: e })
  }
}
