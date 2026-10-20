import { useEffect, useState } from 'react';
import { ArrowRight, Award, Check, ChevronLeft, ChevronRight, Eye, MessageCircle, Play, Plus, Share2 } from 'lucide-react';
import { FESTIVAL, FILMS, SCREENINGS, filmById, venueById } from '../data/programme.js';
import { dateParts, fromMinutes, initials, queueLabel, runtimeLabel, screeningStart, timeLabel, toMinutes } from '../lib/format.js';
import { queueAt, useLiveClock } from '../lib/queues.js';
import { Poster, StatusTag, VenueDot } from '../components/Bits.jsx';
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
      </div>
    </div>
  );
}

function Showtime({ screening, runtime }) {
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
        <span className={`showtime-time${screening.status === 'cancelled' ? ' struck' : ''}`}>{timeLabel(screening.time)}</span>
        {runtime > 0 && <span className="showtime-end">ends {timeLabel(fromMinutes(toMinutes(screening.time) + runtime))}</span>}
        <StatusTag status={screening.status} />
        <span className="venue-line"><VenueDot venueId={venue.id} /> {venue.name}</span>
        <span className="muted small">{screening.screen}</span>
        <span className="showtime-tags">
          <span className={`pill${screening.tag === 'Industry' ? ' pill-alt' : ''}`}>{screening.tag}</span>
          {screening.qa && <span className="pill pill-qa"><MessageCircle size={12} /> Q&amp;A</span>}
        </span>
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

// The whole poster, never cropped: tall posters sit centred, wide ones use
// the full width. No poster (or it fails) → tall colour card with title.
function HeroPoster({ film }) {
  const [shape, setShape] = useState(film.image ? 'loading' : 'none');
  const trailer = film.trailer && (
    <a href={film.trailer} target="_blank" rel="noopener noreferrer" className="trailer-btn">
      <span className="play"><Play size={14} fill="currentColor" /></span> Watch trailer
    </a>
  );
  if (shape === 'none') {
    return (
      <Poster film={{ ...film, image: '' }} className="hero-poster">
        <span className="hero-poster-text">
          <span className="hero-poster-title">{film.title}</span>
          <span className="hero-poster-director">{film.director}</span>
        </span>
        {trailer}
      </Poster>
    );
  }
  return (
    <div className={`hero-poster has-image${shape === 'wide' ? ' wide' : ''}`}>
      <img
        src={film.image} alt={`${film.title} poster`} decoding="async"
        onLoad={(e) => setShape(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight ? 'wide' : 'tall')}
        onError={() => setShape('none')}
      />
      {trailer}
    </div>
  );
}

// Share sheet on phones that have one (WhatsApp, SMS...), otherwise WhatsApp.
function shareFilm(film, showings) {
  const url = `${window.location.origin}/#/film/${film.id}`;
  const when = showings.filter((s) => s.status !== 'cancelled')
    .map((s) => { const p = dateParts(s.date); return `• ${p.day} ${p.date} ${p.month}, ${timeLabel(s.time)} at ${venueById(s.venue).name}`; });
  const text = [
    `${film.title}${film.year ? ` (${film.year})` : ''}, directed by ${film.director}. Showing at AFRIFF 2026:`,
    ...(when.length ? when : ['Showtimes coming soon']),
  ].join('\n');
  if (navigator.share) {
    navigator.share({ title: film.title, text, url }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  }
}

// Sideways row of other films in the same programme section
function MoreFromSection({ film }) {
  const others = FILMS.filter((f) => f.section === film.section && f.id !== film.id).slice(0, 12);
  if (others.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">More from {film.section}</h2>
        <a href="#/programme/films" className="link">See all <ChevronRight size={18} /></a>
      </div>
      <div className="more-row">
        {others.map((f) => (
          <a key={f.id} href={`#/film/${f.id}`} className="more-film">
            <Poster film={f} className="more-poster">{!f.image && <span className="more-poster-title">{f.title}</span>}</Poster>
            <span className="more-title">{f.title}</span>
            <span className="muted small">{runtimeLabel(f.runtime)}</span>
          </a>
        ))}
      </div>
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

      <HeroPoster key={film.id} film={film} />

      <div className="film-badges">
        {film.section && <span className="film-badge">{film.section}</span>}
        {film.premiere && <span className="film-badge gold">{film.premiere}</span>}
        {film.competition && <a href="#/jury" className="film-badge comp"><Award size={13} /> In competition</a>}
      </div>

      <h1 className="film-title">{film.title}</h1>
      <p className="film-facts">{[film.year, film.runtime ? runtimeLabel(film.runtime) : '', film.country].filter(Boolean).join(' · ')}</p>

      <div className="film-actions">
        {showings.length > 0 && (
          <button type="button" className="btn-jump" onClick={() => document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {showings.length} screening{showings.length === 1 ? '' : 's'}
          </button>
        )}
        <button type="button" className={`btn-seen${seen ? ' on' : ''}`} onClick={() => toggleWatched(film.id)} aria-pressed={seen}>
          {seen ? <Check size={20} /> : <Eye size={20} />} Seen it
        </button>
        <button type="button" className="round-btn big" onClick={() => shareFilm(film, showings)} aria-label="Share this film"><Share2 size={20} /></button>
      </div>

      <p className={`synopsis${expanded ? ' open' : ''}`}>{film.synopsis}</p>
      <button type="button" className="read-more" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Show less' : 'Read more'}
      </button>

      <section className="section" id="showtimes">
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
            {showings.map((s) => <Showtime key={s.id} screening={s} runtime={film.runtime} />)}
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
          {film.cast && <><dt>Cast</dt><dd>{film.cast}</dd></>}
          {film.country && <><dt>Country</dt><dd>{film.country}</dd></>}
          {film.language && <><dt>Language</dt><dd>{film.language}</dd></>}
          <dt>Programme</dt><dd>{film.section}</dd>
        </dl>
      </section>

      <MoreFromSection film={film} />
    </div>
  );
}
