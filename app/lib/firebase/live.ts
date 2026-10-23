// Everything the ATTENDEE app says to Firestore, directly through the SDK.
// (No server routes: the old /api/festival and /api/queues relays are gone.)
//
// This module, and the Firebase SDK with it, is only loaded with a dynamic
// import() once the first screen is showing, so it never delays first paint.
// The service worker keeps it on the phone like the rest of the app.
//
// Three things:
//   1. Published festival data. A tiny marker doc, published/version, is
//      watched live. Only when its number is newer than what the phone has
//      is the big bundle (published/current) downloaded, so a phone reads
//      the bundle once per publish, not once per visit.
//   2. Live queue counts: a live listener on the day's venue records
//      (queueDays/{date}/venues, about 3 small docs).
//   3. Anonymous usage counts: one write to usage/{deviceId}. With no signal
//      the write waits on the phone and goes by itself when it's back.
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import type { PublishedSnapshot } from '~/types/festival'
import { firebaseDb } from './app'

// ---------- 1. Published festival data ----------

export interface VersionMark {
  /** The published version number, or null if no marker exists yet. */
  version: number | null
  /** true = answered from the phone's cache (offline, or before the server replied) */
  fromCache: boolean
}

/** Calls back with the published version now, and again whenever an admin publishes. */
export function watchPublishedVersion(onMark: (mark: VersionMark) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(firebaseDb(), 'published', 'version'),
    // also tell us when the same answer is confirmed by the server, so a
    // download that failed offline is retried as soon as the phone reconnects
    { includeMetadataChanges: true },
    (snap) => {
      const v = snap.exists() ? Number(snap.get('version')) || null : null
      onMark({ version: v, fromCache: snap.metadata.fromCache })
    },
    onError,
  )
}

/** The whole published bundle (from the server, or from the phone's cache when offline). */
export async function readPublished(): Promise<PublishedSnapshot | null> {
  const snap = await getDoc(doc(firebaseDb(), 'published', 'current'))
  const json = snap.exists() ? snap.get('json') : null
  if (typeof json !== 'string' || !json) return null
  return JSON.parse(json) as PublishedSnapshot
}

// ---------- 2. Live queue counts ----------

export interface QueueCount {
  venue: string
  inLine: number
  seatsLeft: number
  updatedAt: number | null
}

interface BoardEntry { inLine?: number; seatsLeft?: number; updatedAt?: Timestamp | null }

/** Calls back with every counted screening that day, now and on every change. */
export function watchQueueDay(
  date: string,
  onBoard: (queues: Record<string, QueueCount>, fromCache: boolean) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(firebaseDb(), 'queueDays', date, 'venues'),
    { includeMetadataChanges: true }, // so we know when the counts are live again after a reconnect
    (snap) => {
      const queues: Record<string, QueueCount> = {}
      for (const d of snap.docs) {
        const s = (d.get('s') ?? {}) as Record<string, BoardEntry>
        for (const [id, e] of Object.entries(s)) {
          if (!e || typeof e !== 'object') continue
          queues[id] = {
            venue: d.id,
            inLine: Math.max(0, Number(e.inLine) || 0),
            seatsLeft: Math.max(0, Number(e.seatsLeft) || 0),
            updatedAt: e.updatedAt?.toMillis?.() ?? null,
          }
        }
      }
      onBoard(queues, snap.metadata.fromCache)
    },
    onError,
  )
}

// ---------- 3. Anonymous usage counts ----------

export interface UsagePayload {
  planned: string[]
  seen: Record<string, number>
  days: string[]
}

/**
 * Save this phone's anonymous counts. Doesn't wait for the server: with the
 * offline cache the write is kept on the phone and sent when there's a
 * connection, even if the app is closed and reopened in between.
 */
export function writeUsage(deviceId: string, { planned, seen, days }: UsagePayload) {
  setDoc(doc(firebaseDb(), 'usage', deviceId), { v: 1, updatedAt: serverTimestamp(), planned, seen, days })
    .catch((e) => console.warn('[usage] not saved', e))
}
