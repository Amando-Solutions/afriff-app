// Small helpers shared by the console screens.
import type { Timestamp } from 'firebase/firestore';

/** the message of anything thrown (Firebase errors, plain Errors, strings) */
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** a database time as "23 Oct 2026, 14:05" in Lagos time */
export const whenLagos = (ts: Pick<Timestamp, 'seconds'> | null | undefined, empty = 'just now'): string =>
  ts?.seconds
    ? new Date(ts.seconds * 1000).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })
    : empty;
