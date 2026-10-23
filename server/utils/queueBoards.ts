// Firestore's REST answers wrap every value in its type; unwrap the ones we use.
export interface FsValue {
  integerValue?: string
  doubleValue?: number
  stringValue?: string
  timestampValue?: string
  booleanValue?: boolean
  mapValue?: { fields?: Record<string, FsValue> }
}
export interface FsDocument {
  name: string
  fields?: Record<string, FsValue>
}

type Plain = number | string | boolean | null | { [key: string]: Plain }

function plain(v: FsValue | undefined): Plain {
  if (!v) return null
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue ?? 0
  if ('stringValue' in v) return v.stringValue ?? ''
  if ('timestampValue' in v) return Date.parse(v.timestampValue ?? '')
  if ('booleanValue' in v) return v.booleanValue ?? false
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue?.fields || {}).map(([k, x]) => [k, plain(x)]))
  return null
}

export interface QueueCount {
  venue: string
  inLine: number
  seatsLeft: number
  updatedAt: number | null
}

// One record per venue per day → { screeningId: { venue, inLine, seatsLeft, updatedAt } }
export function boardsToQueues(documents: FsDocument[] = []): Record<string, QueueCount> {
  const queues: Record<string, QueueCount> = {}
  for (const d of documents) {
    const venue = d.name.split('/').pop() ?? ''
    const s = plain({ mapValue: { fields: d.fields?.s?.mapValue?.fields || {} } })
    if (!s || typeof s !== 'object') continue
    for (const [id, e] of Object.entries(s)) {
      if (!e || typeof e !== 'object') continue
      queues[id] = {
        venue,
        inLine: Math.max(0, Number(e.inLine) || 0),
        seatsLeft: Math.max(0, Number(e.seatsLeft) || 0),
        updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : null,
      }
    }
  }
  return queues
}
