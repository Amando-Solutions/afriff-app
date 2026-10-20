import { useState } from 'react';
import { Briefcase, GraduationCap, Mic, PartyPopper, Sparkles, Trophy, Users, Wrench } from 'lucide-react';
import { EVENT_TYPES, isMultiDay } from '../data/events.js';
import { venueById } from '../data/programme.js';
import { dateParts, time12, timeLabel } from '../lib/format.js';
import { useFestival } from '../lib/store.jsx';
import { AddButton, StatusTag, VenueDot } from './Bits.jsx';

// Icon and colours for each kind of event (used where films show a poster)
const LOOK = {
  masterclass: { Icon: GraduationCap, a: '#DBA440', b: '#4A2A08' },
  workshop: { Icon: Wrench, a: '#E9C362', b: '#3A2A12' },
  market: { Icon: Briefcase, a: '#8F84FF', b: '#1E1850' },
  panel: { Icon: Mic, a: '#3CCFB8', b: '#0B3A3A' },
  gala: { Icon: Sparkles, a: '#F07AB8', b: '#4A0F2E' },
  awards: { Icon: Trophy, a: '#E9C362', b: '#2A1F05' },
  party: { Icon: PartyPopper, a: '#F37B6B', b: '#40130E' },
  networking: { Icon: Users, a: '#4DA6FF', b: '#0E2650' },
};

// The event's graphic if it has one (e.g. masterclass posters), otherwise
// a colour tile with an icon for its type.
export function EventThumb({ event, className = 'poster-thumb', size = 24 }) {
  const { Icon, a, b } = LOOK[event.type] || LOOK.networking;
  const [broken, setBroken] = useState(false);
  if (event.image && !broken) {
    return (
      <div className={`poster event-thumb has-image ${className}`} aria-hidden="true">
        <img src={event.image} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div className={`poster event-thumb ${className}`} style={{ background: `linear-gradient(150deg, ${a} 0%, ${b} 100%)` }} aria-hidden="true">
      <Icon size={size} strokeWidth={1.8} />
    </div>
  );
}

export const eventWhere = (e) => (e.venue ? venueById(e.venue).name : e.place);

export function EventRow({ event }) {
  const { isScheduled, toggleScheduled } = useFestival();
  const multi = isMultiDay(event);
  const t = time12(event.time);
  return (
    <div className="row">
      <a href={`#/event/${event.id}`} className="row-link">
        <div className="row-time">
          {multi ? (
            <><span className="row-time-n small">Nightly</span><span className="row-time-ampm">{timeLabel(event.time)}</span></>
          ) : (
            <><span className="row-time-n">{t.time}</span><span className="row-time-ampm">{t.ampm}</span></>
          )}
        </div>
        <div className="row-body">
          <span className={`row-title${event.status === 'cancelled' ? ' struck' : ''}`}>{event.title}</span>
          {event.speaker && <span className="event-speaker">with {event.speaker}</span>}
          <span className="venue-line">{event.venue && <VenueDot venueId={event.venue} />} {eventWhere(event)} <StatusTag status={event.status} /></span>
          <span className="row-cat gold">{EVENT_TYPES[event.type].label}{event.access?.startsWith('Free') ? ' · Free' : ''}</span>
        </div>
        <EventThumb event={event} />
      </a>
      {multi ? <span className="row-spacer" /> : (
        <AddButton added={isScheduled(event.id)} onClick={() => toggleScheduled(event.id)} title={event.title} />
      )}
    </div>
  );
}

// Small card used in the Home strip
export function EventCard({ event }) {
  const p = dateParts(event.date);
  return (
    <a href={`#/event/${event.id}`} className="event-card">
      <EventThumb event={event} className={event.image ? 'event-card-art' : 'event-card-thumb'} size={22} />
      <span className="event-card-type">{EVENT_TYPES[event.type].label}</span>
      <span className="event-card-title">{event.title.split(':')[0]}</span>
      {event.speaker && <span className="muted small">{event.speaker}</span>}
      <span className="event-card-when">{isMultiDay(event) ? 'All week' : `${p.day} ${p.date} ${p.month} · ${timeLabel(event.time)}`}</span>
    </a>
  );
}
