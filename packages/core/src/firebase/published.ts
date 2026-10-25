// The published festival data, read straight from Firestore with the SDK
// (shared by the attendee app and the staff console; see ../published.ts).
//
// A tiny marker doc, published/version, is watched live. Only when its
// number is newer than what the device has is the big bundle
// (published/current) downloaded, so a device reads the bundle once per
// publish, not once per visit.
//
// Loaded with a dynamic import() so the Firebase SDK never delays first paint.
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import type { PublishedSnapshot } from '../types/festival'
import { firebaseDb } from './app'

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
