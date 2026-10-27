// Admins: anonymous counts from attendees' phones (only phones with sharing on).
// Loaded on demand (each phone's counts cost one database read).
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { PublishedSnapshot } from '@afriff/core/types/festival';

export const SELL_OUT_SHARE = 0.8; // flag when planned ≥ 80% of seats

export function csvDownload(name: string, rows: (string | number)[][]) {
  // text starting with = + - @ would run as a formula in Excel / Google Sheets
  // (attendees type their own names), so it gets a leading ' to stay plain text
  const safe = (v: string | number | null | undefined) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v ?? ''));
  const esc = (v: string | number | null | undefined) => `"${safe(v).replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** usage/{randomDeviceId}: what one phone shared (no personal details) */
interface UsageDoc {
  planned?: string[];
  seen?: Record<string, number>;
  days?: string[];
}

export interface PlannedRow {
  id: string;
  count: number;
  kind: 'Screening' | 'Event' | 'Removed';
  title: string;
  date: string;
  time: string;
  where: string;
  capacity: number;
}
export interface RatingRow {
  id: string;
  title: string;
  director: string;
  seen: number;
  rated: number;
  average: number;
}
export interface Report {
  loadedAt: Date;
  phones: number;
  activeByDay: Record<string, number>;
  plannedRows: PlannedRow[];
  ratingRows: RatingRow[];
  totalPlans: number;
  totalRatings: number;
  published: boolean;
}

const byId = <T extends { id?: string }>(list: T[] | undefined) =>
  Object.fromEntries((list || []).filter((x) => x.id).map((x) => [x.id!, x])) as Record<string, T>;

export async function loadReport(): Promise<Report> {
  // names, times and venues from the last published bundle (one read)
  const pub = await getDoc(doc(db, 'published', 'current'));
  const data: PublishedSnapshot = pub.exists() ? JSON.parse(String(pub.data().json)) : { version: 0 };
  const films = byId(data.films);
  const venues = byId(data.venues);
  const screenings = byId(data.screenings);
  const events = byId(data.events);

  const snap = await getDocs(collection(db, 'usage'));
  const phones = snap.docs.map((d) => d.data() as UsageDoc)
    .filter((u) => (u.planned?.length || 0) + Object.keys(u.seen || {}).length + (u.days?.length || 0) > 0);

  const planned: Record<string, number> = {};
  const seenCount: Record<string, number> = {};
  const ratings: Record<string, number[]> = {};
  const activeByDay: Record<string, number> = {};
  for (const u of phones) {
    for (const id of u.planned || []) planned[id] = (planned[id] || 0) + 1;
    for (const [filmId, r] of Object.entries(u.seen || {})) {
      seenCount[filmId] = (seenCount[filmId] || 0) + 1;
      if (r > 0) (ratings[filmId] ||= []).push(Number(r));
    }
    for (const d of u.days || []) activeByDay[d] = (activeByDay[d] || 0) + 1;
  }

  const plannedRows = Object.entries(planned).map(([id, count]): PlannedRow => {
    const s = screenings[id];
    if (s) {
      return {
        id, count, kind: 'Screening', title: films[s.film ?? '']?.title || s.film || '', date: s.date || '', time: s.time || '',
        where: [venues[s.venue ?? '']?.name, s.screen].filter(Boolean).join(' · '), capacity: Number(s.capacity) || 0,
      };
    }
    const e = events[id];
    if (e) return { id, count, kind: 'Event', title: e.title || '', date: e.date || '', time: e.time || '', where: [venues[e.venue ?? '']?.name, e.place].filter(Boolean).join(' · '), capacity: 0 };
    return { id, count, kind: 'Removed', title: `(no longer in the programme: ${id})`, date: '', time: '', where: '', capacity: 0 };
  }).sort((a, b) => b.count - a.count);

  const ratingRows = Object.keys(seenCount).map((id): RatingRow => {
    const rs = ratings[id] || [];
    return {
      id, title: films[id]?.title || id, director: films[id]?.director || '',
      seen: seenCount[id] || 0, rated: rs.length, average: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
    };
  });

  return {
    loadedAt: new Date(), phones: phones.length, activeByDay, plannedRows, ratingRows,
    totalPlans: Object.values(planned).reduce((a, b) => a + b, 0),
    totalRatings: Object.values(ratings).reduce((a, r) => a + r.length, 0),
    published: pub.exists(),
  };
}
