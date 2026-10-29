// What the ATTENDEE app says to Firestore, directly through the SDK (no
// server routes). Published festival data lives in @afriff/core
// (firebase/published.ts), because the staff console reads it too.
//
// This module, and the Firebase SDK with it, is only loaded with a dynamic
// import() once the first screen is showing, so it never delays first paint.
// The service worker keeps it on the phone like the rest of the app.
//
// Two things:
//   1. Live queue counts: a live listener on the day's venue records
//      (queueDays/{date}/venues, about 3 small docs).
//   2. Anonymous usage counts: one write to usage/{deviceId}. With no signal
//      the write waits on the phone and goes by itself when it's back.
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { firebaseDb } from '@afriff/core/firebase/app'

// ---------- 1. Live queue counts ----------

export interface QueueCount {
  venue: string
  inLine: number
  seatsLeft: number
  seatsStart: number | null
  updatedAt: number | null
}

interface BoardEntry { inLine?: number; seatsLeft?: number; seatsStart?: number; updatedAt?: Timestamp | null }

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
            seatsStart: Number(e.seatsStart) > 0 ? Number(e.seatsStart) : null,
            updatedAt: e.updatedAt?.toMillis?.() ?? null,
          }
        }
      }
      onBoard(queues, snap.metadata.fromCache)
    },
    onError,
  )
}

// ---------- 2. Anonymous usage counts ----------

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
