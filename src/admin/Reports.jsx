import { useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { db } from './firebase.js';
import { FESTIVAL } from '../data/programme.js';
import { dayLabel, timeLabel } from '../lib/format.js';
import { lagosDate } from '../lib/now.js';

// Admins: anonymous counts from attendees' phones (only phones with sharing on).
// Loaded on demand (each phone's counts cost one database read).

const SELL_OUT_SHARE = 0.8; // flag when planned ≥ 80% of seats

function csvDownload(name, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadReport() {
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

function Tile({ n, label }) {
  return (
    <div className="stat-tile">
      <span className="stat-n">{n}</span>
      <span className="stat-l">{label}</span>
    </div>
  );
}

export default function Reports() {
  const [state, setState] = useState({ busy: false, report: null, error: '' });
  const [day, setDay] = useState('all');

  const run = async () => {
    setState((s) => ({ ...s, busy: true, error: '' }));
    try {
      setState({ busy: false, report: await loadReport(), error: '' });
    } catch (e) {
      setState((s) => ({ ...s, busy: false, error: e.message }));
    }
  };

  const r = state.report;
  const today = lagosDate();
  const plannedShown = r ? r.plannedRows.filter((p) => day === 'all' || p.date === day).slice(0, 25) : [];
  const topRated = r ? r.ratingRows.filter((x) => x.rated >= 3).sort((a, b) => b.average - a.average || b.rated - a.rated).slice(0, 15) : [];
  const mostSeen = r ? [...r.ratingRows].sort((a, b) => b.seen - a.seen).slice(0, 15) : [];
  const maxDay = r ? Math.max(1, ...FESTIVAL.days.map((d) => r.activeByDay[d] || 0)) : 1;

  return (
    <div className="ad-page">
      <h1 className="ad-title">Reports</h1>
      <p className="muted">
        Anonymous counts from attendees' phones that have sharing switched on (it's on unless they turn it off in My Festival).
        No names or contact details. Real numbers are higher, because not every phone shares.
      </p>
      <button type="button" className="btn btn-gold btn-small" onClick={run} disabled={state.busy} style={{ alignSelf: 'flex-start' }}>
        <RefreshCw size={16} /> {state.busy ? 'Loading…' : r ? 'Refresh reports' : 'Load reports'}
      </button>
      <p className="muted small">Each load reads one record per phone, so load when you need it rather than leaving it open all day.</p>
      {state.error && <p className="ad-error">Couldn't load: {state.error}</p>}

      {r && (
        <>
          {!r.published && <p className="ad-info">Nothing has been published yet, so names may be missing. Press Publish to app first.</p>}
          <div className="stat-tiles rep-tiles">
            <Tile n={r.phones} label="phones sharing" />
            <Tile n={r.activeByDay[today] || 0} label="active today" />
            <Tile n={r.totalPlans} label="plans made" />
            <Tile n={r.totalRatings} label="star ratings" />
          </div>

          <section className="rep-section">
            <div className="rep-head">
              <h2 className="ad-h2"><BarChart3 size={18} /> Most planned</h2>
              <button type="button" className="btn btn-outline btn-small" onClick={() => csvDownload('afriff-most-planned.csv', [
                ['Type', 'Title', 'Day', 'Time', 'Where', 'Phones planning', 'Seats'],
                ...r.plannedRows.map((p) => [p.kind, p.title, p.date, p.time, p.where, p.count, p.capacity || '']),
              ])}><Download size={14} /> Spreadsheet</button>
            </div>
            <select className="rep-select" value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day">
              <option value="all">All days</option>
              {FESTIVAL.days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
            </select>
            {plannedShown.length === 0 && <p className="muted">No plans yet{day !== 'all' ? ' for this day' : ''}.</p>}
            <ol className="rep-list">
              {plannedShown.map((p) => {
                const tight = p.capacity && p.count >= p.capacity * SELL_OUT_SHARE;
                return (
                  <li key={p.id} className="rep-row">
                    <span className="rep-count">{p.count}</span>
                    <span className="rep-text">
                      <span className="rep-title">{p.title}{tight && <span className="status-tag tone-alert rep-flag">May sell out</span>}</span>
                      <span className="muted small">{p.kind} · {p.date ? dayLabel(p.date) : ''} {p.time ? timeLabel(p.time) : ''} · {p.where}{p.capacity ? ` · ${p.capacity} seats` : ''}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rep-section">
            <div className="rep-head">
              <h2 className="ad-h2">Ratings</h2>
              <button type="button" className="btn btn-outline btn-small" onClick={() => csvDownload('afriff-ratings.csv', [
                ['Film', 'Director', 'Marked seen', 'Star ratings', 'Average stars'],
                ...r.ratingRows.sort((a, b) => b.seen - a.seen).map((x) => [x.title, x.director, x.seen, x.rated, x.rated ? x.average.toFixed(2) : '']),
              ])}><Download size={14} /> Spreadsheet</button>
            </div>
            <h3 className="rep-sub">Highest rated <span className="muted small">(films with at least 3 ratings)</span></h3>
            {topRated.length === 0 && <p className="muted">Not enough ratings yet.</p>}
            <ol className="rep-list">
              {topRated.map((x) => (
                <li key={x.id} className="rep-row">
                  <span className="rep-count">{x.average.toFixed(1)}★</span>
                  <span className="rep-text"><span className="rep-title">{x.title}</span><span className="muted small">{x.rated} ratings · {x.seen} marked seen</span></span>
                </li>
              ))}
            </ol>
            <h3 className="rep-sub">Most seen</h3>
            {mostSeen.length === 0 && <p className="muted">Nobody has marked a film seen yet.</p>}
            <ol className="rep-list">
              {mostSeen.map((x) => (
                <li key={x.id} className="rep-row">
                  <span className="rep-count">{x.seen}</span>
                  <span className="rep-text"><span className="rep-title">{x.title}</span><span className="muted small">{x.director}{x.rated ? ` · ${x.average.toFixed(1)}★ from ${x.rated}` : ''}</span></span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rep-section">
            <div className="rep-head">
              <h2 className="ad-h2">App usage</h2>
              <button type="button" className="btn btn-outline btn-small" onClick={() => csvDownload('afriff-app-usage.csv', [
                ['Day', 'Phones that opened the app'],
                ...Object.entries(r.activeByDay).sort().map(([d, n]) => [d, n]),
              ])}><Download size={14} /> Spreadsheet</button>
            </div>
            <p className="muted small">Phones that opened the app each festival day.</p>
            <div className="rep-bars">
              {FESTIVAL.days.map((d) => {
                const n = r.activeByDay[d] || 0;
                return (
                  <div key={d} className="rep-bar-row">
                    <span className="rep-bar-day">{dayLabel(d)}</span>
                    <span className="rep-bar-track"><span className="rep-bar" style={{ width: `${(n / maxDay) * 100}%` }} /></span>
                    <span className="rep-bar-n">{n}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <p className="muted small">Loaded {r.loadedAt.toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })}.</p>
        </>
      )}
    </div>
  );
}
