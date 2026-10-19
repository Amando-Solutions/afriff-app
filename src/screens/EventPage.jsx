import { ArrowUpRight, Check, ChevronLeft, Clock, Navigation, Plus, Ticket } from 'lucide-react';
import { EVENT_TYPES, eventById, isMultiDay } from '../data/events.js';
import { venueById } from '../data/programme.js';
import { dateParts, initials, timeLabel, toMinutes } from '../lib/format.js';
import { VenueDot } from '../components/Bits.jsx';
import { EventThumb } from '../components/EventBits.jsx';
import { directionsUrl } from '../components/HowToAttend.jsx';
import { useFestival } from '../lib/store.jsx';

const durationLabel = (start, end) => {
  let mins = toMinutes(end) - toMinutes(start);
  if (mins <= 0) mins += 24 * 60; // runs past midnight
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
};

export default function EventPage({ param }) {
  const event = eventById(param);
  const { isScheduled, toggleScheduled } = useFestival();

  if (!event) {
    return (
      <div className="page">
        <p className="empty">We couldn't find that event. <a className="link" href="#/programme/events">Back to events</a></p>
      </div>
    );
  }

  const type = EVENT_TYPES[event.type];
  const multi = isMultiDay(event);
  const p = dateParts(event.date);
  const venue = event.venue ? venueById(event.venue) : null;
  const added = isScheduled(event.id);
  const back = (e) => {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  };

  return (
    <div className="page film-page">
      <div className="film-topbar">
        <a href="#/programme/events" className="pill-btn" onClick={back}><ChevronLeft size={20} /> Back</a>
        <div className="film-topbar-right">
          <span className="pill-btn static">{type.label}</span>
          <span className="pill-btn static"><Clock size={15} /> {durationLabel(event.time, event.end)}</span>
        </div>
      </div>

      <div className="event-hero">
        <EventThumb event={event} className="event-hero-art" size={56} />
        <span className="event-hero-type">{type.label}</span>
      </div>

      <h1 className="film-title">{event.title}</h1>
      <p className="muted small"><Ticket size={14} style={{ verticalAlign: '-2px' }} /> {event.access}</p>

      {event.link && (
        <a className="btn btn-gold event-cta" href={event.link.url} target="_blank" rel="noopener noreferrer">
          {event.link.label} <ArrowUpRight size={18} />
        </a>
      )}

      <section className="section">
        <h2 className="section-title">About</h2>
        <p className="event-about">{event.about}</p>
      </section>

      <section className="section">
        <h2 className="section-title">When & where</h2>
        <div className="showtime event-when">
          <div className="showtime-card">
            <div className="showtime-date">
              <span className="big-num">{String(p.date).padStart(2, '0')}</span>
              <span className="showtime-mon">
                {multi ? `– ${String(dateParts(event.endDate).date).padStart(2, '0')} ${p.monthUpper}` : `${p.monthUpper} ${p.day.toUpperCase()}`}
              </span>
            </div>
            <span className="showtime-time">{multi ? 'Evenings from ' : ''}{timeLabel(event.time)} – {timeLabel(event.end)}</span>
            <span className="venue-line">{venue && <VenueDot venueId={venue.id} />} {venue ? venue.name : event.place}</span>
            {venue && <span className="muted small">{event.place}</span>}
            {event.tag === 'Industry' && <span className="pill pill-alt">Industry</span>}
          </div>
          {!multi && (
            <button type="button" className={`btn-schedule${added ? ' added' : ''}`} onClick={() => toggleScheduled(event.id)} aria-pressed={added}>
              {added ? <><Check size={18} /> Scheduled</> : <><Plus size={18} /> Schedule</>}
            </button>
          )}
          {venue && (
            <a className="btn-schedule" href={directionsUrl(venue.address)} target="_blank" rel="noopener noreferrer">
              <Navigation size={16} /> Directions
            </a>
          )}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Times and rooms are samples until AFRIFF publishes the schedule.</p>
      </section>

      {event.speaker && (
        <section className="section">
          <h2 className="section-title">With</h2>
          <div className="speaker">
            <div className="initials-tile">{initials(event.speaker.replace(/\(.*\)/, ''))}</div>
            <div className="speaker-text">
              <span className="director-name">{event.speaker}</span>
              <span className="muted small">{event.speakerRole}</span>
              {event.bio && <p className="speaker-bio">{event.bio}</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
