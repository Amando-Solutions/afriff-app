import { useRef } from 'react';
import { ArrowUpRight, Check, Download, ListChecks, Share2, Star } from 'lucide-react';
import { FILMS } from '../data/programme.js';
import { dateParts, timeLabel } from '../lib/format.js';
import { PageTitle, Poster, VenueDot } from '../components/Bits.jsx';
import { EventThumb } from '../components/EventBits.jsx';
import { planItems } from '../lib/plan.js';
import { useFestival } from '../lib/store.jsx';

const LETTERBOXD_IMPORT = 'https://letterboxd.com/import/';

function shareDay(date, list) {
  const p = dateParts(date);
  const lines = list.map((item) => `• ${timeLabel(item.time)}: ${item.title} (${item.where})`);
  const text = `My AFRIFF day, ${p.day} ${p.date} ${p.month}:\n${lines.join('\n')}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

// CSV in Letterboxd's import format: https://letterboxd.com/about/importing-data/
function exportLetterboxd(entries) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Title', 'Year', 'Directors', 'WatchedDate', 'Rating', 'Tags'],
    ...entries.map(({ film, date, rating }) => [film.title, film.year || '', film.director.replace(/ & /g, ', '), date, rating || '', 'afriff2026']),
  ];
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'afriff-2026-letterboxd.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stars({ value, onChange, title }) {
  return (
    <div className="stars" role="radiogroup" aria-label={`Your rating for ${title}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= value ? 'on' : ''}
          // tapping your current rating again clears it
          onClick={() => onChange(value === n ? 0 : n)}
        >
          <Star size={20} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}

function Diary({ sectionRef }) {
  const { watched, rateWatched } = useFestival();
  const entries = FILMS.filter((f) => watched.has(f.id)).map((film) => ({ film, ...watched.get(film.id) }));
  const n = entries.length;
  return (
    <section className="section" ref={sectionRef}>
      <h2 className="section-title">Watched</h2>
      <p className="muted"><strong className="diary-count">{n}</strong> film{n === 1 ? '' : 's'} logged</p>

      <div className="diary-actions">
        <button type="button" className="btn btn-gold btn-small" disabled={n === 0} onClick={() => exportLetterboxd(entries)}>
          <Download size={16} /> Export to Letterboxd
        </button>
        <a className="btn btn-outline btn-small" href={LETTERBOXD_IMPORT} target="_blank" rel="noopener noreferrer">
          <ArrowUpRight size={16} /> Letterboxd import
        </a>
      </div>

      <ol className="steps">
        <li><span>Tap <strong>Seen it</strong> on any film page, or the eye on the All films list.</span></li>
        <li><span>Give it a star rating if you like.</span></li>
        <li><span>Tap <strong>Export</strong>, then upload the file at letterboxd.com/import. Each film becomes a diary entry tagged afriff2026, and you can check the matches before anything is saved.</span></li>
      </ol>

      {n === 0 ? (
        <p className="muted">Nothing logged yet. Tap Seen it on a film after the screening.</p>
      ) : (
        entries.map(({ film, rating }) => (
          <div key={film.id} className="diary-row">
            <a href={`#/film/${film.id}`} className="my-row-link">
              <Poster film={film} className="poster-thumb" />
              <span className="my-row-body">
                <span className="my-row-title">{film.title}</span>
                <span className="muted small">{film.director} · {film.country || film.section}</span>
              </span>
            </a>
            <Stars value={rating} onChange={(r) => rateWatched(film.id, r)} title={film.title} />
          </div>
        ))
      )}
    </section>
  );
}

export default function MyFestival() {
  const { scheduled, watched, queuesChecked, toggleScheduled } = useFestival();
  const diaryRef = useRef(null);
  const mine = planItems(scheduled);
  const nFilms = mine.filter((i) => i.kind === 'screening').length;
  const nEvents = mine.length - nFilms;
  const byDay = mine.reduce((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});
  const days = Object.keys(byDay);

  return (
    <div className="page">
      <PageTitle icon={ListChecks}>My Schedule</PageTitle>
      <p className="muted">
        {nFilms} screening{nFilms === 1 ? '' : 's'}{nEvents > 0 ? ` and ${nEvents} event${nEvents === 1 ? '' : 's'}` : ''} over {days.length} day{days.length === 1 ? '' : 's'}
      </p>

      <div className="stat-tiles">
        <button type="button" className="stat-tile" onClick={() => diaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span className="stat-n">{watched.size}</span>
          <span className="stat-l">{watched.size === 1 ? 'film' : 'films'} seen</span>
        </button>
        <div className="stat-tile">
          <span className="stat-n">{mine.length}</span>
          <span className="stat-l">in your plan</span>
        </div>
        <a href="#/queues" className="stat-tile">
          <span className="stat-n">{queuesChecked.size}</span>
          <span className="stat-l">queues checked</span>
        </a>
      </div>

      {mine.length === 0 && (
        <div className="empty-block">
          <p className="muted">Nothing here yet. Tap + on any screening to add it.</p>
          <a className="underline-link" href="#/programme">Browse the schedule</a>
        </div>
      )}

      {days.map((date) => {
        const p = dateParts(date);
        return (
          <section key={date} className="my-day">
            <div className="my-day-head">
              <h2 className="my-day-title">{p.day} {p.month} {p.date}</h2>
              <button type="button" className="btn-pill" onClick={() => shareDay(date, byDay[date])}>
                <Share2 size={18} /> Share my day
              </button>
            </div>
            {byDay[date].map((item) => {
              return (
                <div key={item.id} className="my-row">
                  <a href={item.href} className="my-row-link">
                    {item.kind === 'screening' ? <Poster film={item.film} className="poster-thumb" /> : <EventThumb event={item.event} />}
                    <span className="my-row-body">
                      <span className="muted small">{timeLabel(item.time)} – {timeLabel(item.end)}{item.typeLabel ? ` · ${item.typeLabel}` : ''}</span>
                      <span className="my-row-title">{item.title}</span>
                      <span className="venue-line">{item.venue && <VenueDot venueId={item.venue} />} {item.where}</span>
                    </span>
                  </a>
                  <button type="button" className="round-btn added big" onClick={() => toggleScheduled(item.id)} aria-label={`Remove ${item.title} from My Festival`}>
                    <Check size={22} strokeWidth={2.4} />
                  </button>
                </div>
              );
            })}
          </section>
        );
      })}

      <Diary sectionRef={diaryRef} />

      <p className="footnote">Kept on this phone. No account needed.</p>
    </div>
  );
}
