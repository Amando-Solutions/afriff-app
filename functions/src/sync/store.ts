// The few database operations the sync needs, behind one small interface, so the
// same code runs against the real Firestore (in the cloud) and a pretend
// in-memory database (in tests).

import type { Firestore, Timestamp, WriteBatch } from 'firebase-admin/firestore'

/** Put this as a top-level value to store the database's own clock time (like serverTimestamp()) */
export const SERVER_TIME = Symbol('server time')

export type Data = Record<string, unknown>

export type Write =
  | { kind: 'set'; path: string; data: Data; merge?: boolean }
  /** create a new document; fails if it exists */
  | { kind: 'create'; path: string; data: Data }
  /** change some fields; fails if the document changed since it was read (version = what was read) */
  | { kind: 'update'; path: string; data: Data; version?: unknown }

export interface StoredDoc {
  data: Data
  /** opaque version, to make sure nobody changed it before we write */
  version?: unknown
}

export interface Store {
  get(path: string): Promise<Data | null>
  list(collection: string): Promise<Map<string, StoredDoc>>
  newId(collection: string): string
  /** all writes together: all happen or none do */
  commit(writes: Write[]): Promise<void>
}

const withServerTime = (data: Data, now: unknown): Data =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === SERVER_TIME ? now : v]))

/** The real database (Firebase Admin SDK: full access, security rules don't apply) */
export function firestoreStore(db: Firestore, serverTime: () => unknown): Store {
  return {
    async get(path) {
      const snap = await db.doc(path).get()
      return snap.exists ? (snap.data() as Data) : null
    },
    async list(collection) {
      const snap = await db.collection(collection).get()
      return new Map(snap.docs.map((d) => [d.id, { data: d.data(), version: d.updateTime }]))
    },
    newId: (collection) => db.collection(collection).doc().id,
    async commit(writes) {
      if (writes.length > 450) throw new Error(`Too many changes for one save (${writes.length})`)
      const batch: WriteBatch = db.batch()
      for (const w of writes) {
        const ref = db.doc(w.path)
        const data = withServerTime(w.data, serverTime())
        if (w.kind === 'set') batch.set(ref, data, { merge: !!w.merge })
        else if (w.kind === 'create') batch.create(ref, data)
        else if (w.version) batch.update(ref, data, { lastUpdateTime: w.version as Timestamp })
        else batch.update(ref, data)
      }
      await batch.commit()
    },
  }
}

/** A pretend database for tests (plain objects; versions are counters) */
export function memoryStore(initial: Record<string, Data> = {}) {
  const docs = new Map<string, { data: Data; version: number }>(Object.entries(initial).map(([p, d]) => [p, { data: structuredClone(d), version: 1 }]))
  let ids = 0
  let clock = 0
  const store: Store & { docs: typeof docs; commits: number } = {
    docs,
    commits: 0,
    async get(path) {
      const d = docs.get(path)
      return d ? structuredClone(d.data) : null
    },
    async list(collection) {
      const out = new Map<string, StoredDoc>()
      for (const [p, d] of docs) {
        const m = p.match(/^([^/]+)\/([^/]+)$/)
        if (m && m[1] === collection) out.set(m[2]!, { data: structuredClone(d.data), version: d.version })
      }
      return out
    },
    newId: (collection) => `${collection}-${++ids}`,
    async commit(writes) {
      // check everything first, so a failure changes nothing (like a real batch)
      for (const w of writes) {
        const d = docs.get(w.path)
        if (w.kind === 'create' && d) throw new Error(`${w.path} already exists`)
        if (w.kind === 'update' && !d) throw new Error(`${w.path} doesn't exist`)
        if (w.kind === 'update' && w.version != null && d!.version !== w.version) throw new Error(`${w.path} was changed by someone else`)
      }
      for (const w of writes) {
        const data = structuredClone(withServerTime(w.data, { seconds: ++clock }))
        const d = docs.get(w.path)
        const merged = w.kind === 'update' || (w.kind === 'set' && w.merge) ? { ...(d?.data ?? {}), ...data } : data
        docs.set(w.path, { data: merged, version: (d?.version ?? 0) + 1 })
      }
      store.commits += 1
    },
  }
  return store
}
