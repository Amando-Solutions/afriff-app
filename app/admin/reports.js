// Admins: anonymous counts from attendees' phones (only phones with sharing on).
// Loaded on demand (each phone's counts cost one database read).
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase.js';

export const SELL_OUT_SHARE = 0.8; // flag when planned ≥ 80% of seats

export function csvDownload(name, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function loadReport() {
  // names, times and venues from the last published bundle (one read)
  const pub = await getDoc(doc(db, 'published', 'current'));
  const data = pub.exists() ? JSON.parse(pub.data().json) : {};
  const films = Object.fromEntries((data.films || []).map((f) => [f.id, f]));
  const venues = Object.fromEntries((data.venues || []).map((v) => [v.id, v]));
  const screenings = Object.fromEntries((data.screenings || []).map((s) => [s.id, s]));
  const events = Object.fromEntries((data.events || []).map((e) => [e.id, e]));

  const snap = await getDocs(collection(db, 'usage'));
  const phones = snap.docs.map((d) => d.data()).filter((u) => (u.planned?.length || 0) + Object.keys(u.seen || {}).length + (u.days?.length || 0) > 0);

  const planned = {};
  const seenCount = {};
  const ratings = {};
  const activeByDay = {};
  for (const u of phones) {
    for (const id of u.planned || []) planned[id] = (planned[id] || 0) + 1;
    for (const [filmId, r] of Object.entries(u.seen || {})) {
      seenCount[filmId] = (seenCount[filmId] || 0) + 1;
      if (r > 0) (ratings[filmId] ||= []).push(Number(r));
    }
    for (const d of u.days || []) activeByDay[d] = (activeByDay[d] || 0) + 1;
  }

  const plannedRows = Object.entries(planned).map(([id, count]) => {
    const s = screenings[id];
    if (s) {
      return {
        id, count, kind: 'Screening', title: films[s.film]?.title || s.film, date: s.date, time: s.time,
        where: [venues[s.venue]?.name, s.screen].filter(Boolean).join(' · '), capacity: Number(s.capacity) || 0,
      };
    }
    const e = events[id];
    if (e) return { id, count, kind: 'Event', title: e.title, date: e.date, time: e.time, where: [venues[e.venue]?.name, e.place].filter(Boolean).join(' · '), capacity: 0 };
    return { id, count, kind: 'Removed', title: `(no longer in the programme: ${id})`, date: '', time: '', where: '', capacity: 0 };
  }).sort((a, b) => b.count - a.count);

  const ratingRows = Object.keys(seenCount).map((id) => {
    const rs = ratings[id] || [];
    return {
      id, title: films[id]?.title || id, director: films[id]?.director || '',
      seen: seenCount[id], rated: rs.length, average: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
    };
  });

  return {
    loadedAt: new Date(), phones: phones.length, activeByDay, plannedRows, ratingRows,
    totalPlans: Object.values(planned).reduce((a, b) => a + b, 0),
    totalRatings: Object.values(ratings).reduce((a, r) => a + r.length, 0),
    published: pub.exists(),
  };
}

