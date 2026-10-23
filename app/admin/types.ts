// Shapes of the admin console's own records in Firestore.
import type { Timestamp } from 'firebase/firestore';

export type Role = 'pending' | 'volunteer' | 'editor' | 'admin';

/** users/{uid}: a team member and what they may do */
export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** door volunteers only: the venue they count at */
  venue: string | null;
}

/** Any document in one of the festival collections (films, screenings…) */
export type DataDoc = Record<string, unknown> & { id: string };
/** id → document, for looking up names (film titles, venue names…) */
export type DocMap = Record<string, DataDoc>;
export interface Refs {
  films?: DocMap;
  venues?: DocMap;
  screenings?: DocMap;
  events?: DocMap;
}

/** changes/{id}: an editor's change waiting for (or past) approval */
export interface ChangeDoc {
  id: string;
  collection: string;
  docId: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown> | null;
  before: Record<string, unknown> | null;
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedByName: string;
  submittedAt?: Timestamp;
  reviewedByName?: string;
  note?: string;
}

/** A screening as the door view reads it from the database */
export interface DoorScreening {
  id: string;
  film: string;
  venue: string;
  screen?: string;
  date: string;
  time: string;
  capacity?: number;
}

/** One screening's count inside queueDays/{date}/venues/{venue} */
export interface BoardEntry {
  inLine?: number;
  seatsLeft?: number;
  /** seats available at the door when counting started */
  seatsStart?: number;
  updatedAt?: Timestamp;
  byName?: string;
}
export interface BoardDoc {
  date: string;
  venue: string;
  updatedAt?: Timestamp;
  s?: Record<string, BoardEntry>;
}
