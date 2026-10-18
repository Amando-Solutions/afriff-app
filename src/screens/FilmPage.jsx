import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Clock, Eye, Play, Plus } from 'lucide-react';
import { FESTIVAL, SCREENINGS, filmById, venueById } from '../data/programme.js';
import { dateParts, initials, queueLabel, runtimeLabel, screeningStart, timeLabel } from '../lib/format.js';
import { queueAt, useLiveClock } from '../lib/queues.js';
import { Poster, VenueDot } from '../components/Bits.jsx';
import { useFestival } from '../lib/store.jsx';

function TopBar({ film }) {
  const back = (e) => {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  };
  return (
    <div className="film-topbar">
      <a href="#/programme" className="pill-btn" onClick={back}>
        <ChevronLeft size={20} /> Back
      </a>
      <div className="film-topbar-right">
        {film.genre && <span className="pill-btn static">{film.genre}</span>}
        <span className="pill-btn static"><Clock size={15} /> {runtimeLabel(film.runtime)}</span>
      </div>
    </div>
  );
}

function Showtime({ screening }) {
  const { isScheduled, toggleScheduled } = useFestival();
  const p = dateParts(screening.date);
  const venue = venueById(screening.venue);
  const added = isScheduled(screening.id);
  return (
    <div className="showtime">
      <div className="showtime-card">
        <div className="showtime-date">
          <span className="big-num">{String(p.date).padStart(2, '0')}</span>
          <span className="showtime-mon">{p.monthUpper} {p.day.toUpperCase()}</span>
        </div>
        <span className="showtime-time">{timeLabel(screening.time)}</span>
        <span className="venue-line"><VenueDot venueId={venue.id} /> {venue.name}</span>
        <span className="muted small">{screening.screen}</span>
        <span className={`pill${screening.tag === 'Industry' ? ' pill-alt' : ''}`}>{screening.tag}</span>
      </div>
      <button type="button" className={`btn-schedule${added ? ' added' : ''}`} onClick={() => toggleScheduled(screening.id)} aria-pressed={added}>
        {added ? <><Check size={18} /> Scheduled</> : <><Plus size={18} /> Schedule</>}
      </button>
    </div>
  );
}

function QueueSection({ film, showings }) {
  const t = useLiveClock();
  // a showing's queue is over once the film has started
  const allDone = showings.length > 0 && showings.every((s) => screeningStart(s).getTime() < t);
  const open = showings.map((s) => ({ ...s, queue: queueAt(s, t) })).filter((s) => s.queue);
  const { markQueuesChecked } = useFestival();
  const shownIds = open.map((s) => s.id).join(',');
  useEffect(() => {
    if (shownIds) markQueuesChecked(shownIds.split(','));
  }, [shownIds, markQueuesChecked]);
  return (
    <section className="section">
      <h2 className="section-title">Queue</h2>
      {allDone ? (
        <p className="muted">Every showing has screened. No queues left for this film.</p>
      ) : open.length === 0 ? (
        <p className="muted">Queues open 2 hours before each showing. Check back then for a live count.</p>
      ) : (
        <div className="stack">
          {open.map((s) => {
            const label = queueLabel(s.queue);
            return (
              <div key={s.id} className="queue-card">
                <div>
                  <span className="queue-count">{s.queue.inLine}</span>
                  <span className="muted small"> in line · {s.queue.seatsLeft} seats left</span>
                  <div className="muted small">{dateParts(s.date).day} {timeLabel(s.time)} · {venueById(s.venue).name}</div>
                </div>
                <span className={`label tone-${label.tone}`}>{label.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function FilmPage({ param }) {
  const film = filmById(param);
  const { isWatched, toggleWatched } = useFestival();
  const [expanded, setExpanded] = useState(false);

  if (!film) {
    return (
      <div className="page">
        <p className="empty">We couldn't find that film. <a className="link" href="#/programme">Back to the programme</a></p>
      </div>
    );
  }

  const showings = SCREENINGS.filter((s) => s.film === film.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const seen = isWatched(film.id);
  const directors = film.director.split(' & ');

  return (
    <div className="page film-page">
      <TopBar film={film} />

      <Poster film={film} className="poster-hero">
        {!film.image && <span className="poster-hero-title">{film.title}</span>}
        {film.trailer && (
          <a href={film.trailer} target="_blank" rel="noopener noreferrer" className="trailer-btn">
            <span className="play"><Play size={14} fill="currentColor" /></span> Watch trailer
          </a>
        )}
      </Poster>

      <h1 className="film-title">{film.title}</h1>

      <button type="button" className={`btn-seen${seen ? ' on' : ''}`} onClick={() => toggleWatched(film.id)} aria-pressed={seen}>
        {seen ? <Check size={20} /> : <Eye size={20} />} Seen it
      </button>

      <p className={`synopsis${expanded ? ' open' : ''}`}>{film.synopsis}</p>
      <button type="button" className="read-more" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Show less' : 'Read more'}
      </button>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Showtimes</h2>
          <a href={FESTIVAL.filmUrl(film.id)} target="_blank" rel="noopener noreferrer" className="underline-link">
            On afriff.com <ArrowRight size={16} />
          </a>
        </div>
        {showings.length === 0 ? (
          <p className="muted">Showtimes will appear here once the schedule is published.</p>
        ) : (
          <div className="showtimes">
            {showings.map((s) => <Showtime key={s.id} screening={s} />)}
          </div>
        )}
      </section>

      <QueueSection film={film} showings={showings} />

      <section className="section">
        <h2 className="section-title">Directed by</h2>
        <div className="directors">
          {directors.map((d) => (
            <div key={d} className="director">
              <div className="initials-tile">{initials(d)}</div>
              <span className="director-name">{d}</span>
            </div>
          ))}
        </div>
        <dl className="facts">
          {film.country && <><dt>Country</dt><dd>{film.country}</dd></>}
          {film.language && <><dt>Language</dt><dd>{film.language}</dd></>}
          <dt>Programme</dt><dd>{film.section}</dd>
        </dl>
      </section>
    </div>
  );
}
