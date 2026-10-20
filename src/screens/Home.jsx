import { useEffect, useState } from 'react';
import { ArrowRight, BookmarkCheck, CalendarDays, ChevronRight, Info, MapPin, Users, X, AlertTriangle } from 'lucide-react';
import HowToAttend from '../components/HowToAttend.jsx';
import { FESTIVAL, FILMS, NEWS, SCREENINGS, SPONSORS, VENUES, filmById, venueById } from '../data/programme.js';
import { dateParts, queueLabel, runtimeLabel, timeLabel } from '../lib/format.js';
import { Poster } from '../components/Bits.jsx';
import { openQueues, queueAt, useLiveClock } from '../lib/queues.js';
import { now as clockNow } from '../lib/now.js';
import { useFestival } from '../lib/store.jsx';
import { EVENTS, EVENT_TYPES, isMultiDay } from '../data/events.js';
import { EventCard } from '../components/EventBits.jsx';

function useCountdown(target) {
  const [now, setNow] = useState(() => clockNow().getTime());
  useEffect(() => {
    const t = setInterval(() => setNow(clockNow().getTime()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const sec = Math.floor(diff / 1000);
  return {
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    mins: Math.floor((sec % 3600) / 60),
    secs: sec % 60,
    done: diff === 0,
  };
}

function NewsBanner() {
  const urgent = NEWS.find((n) => n.urgent);
  const [hidden, setHidden] = useState(false);
  if (!urgent || hidden) return null;
  return (
    <div className="news-banner" role="status">
      <AlertTriangle size={20} className="news-banner-icon" />
      <a href="#/news" className="news-banner-text">
        <strong>{urgent.title}.</strong> {urgent.body}
      </a>
      <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setHidden(true)}>
        <X size={18} />
      </button>
    </div>
  );
}

function Hero() {
  const c = useCountdown(FESTIVAL.openingNight);
  const units = [
    [c.days, 'Days'], [c.hours, 'Hours'], [c.mins, 'Mins'], [c.secs, 'Secs'],
  ];
  return (
    <section className="hero">
      <h2 className="hero-title">Seven days of African stories on the big screen.</h2>
      <div className="hero-meta">
        <span><CalendarDays size={18} /> 1–7 November 2026</span>
        <span><MapPin size={18} /> {VENUES.length} venues across Lagos</span>
      </div>
      <hr className="hero-rule" />
      {c.done ? (
        <p className="hero-sub">The festival is on. Enjoy the films!</p>
      ) : (
        <>
          <p className="hero-sub">Opening night in</p>
          <div className="countdown">
            {units.map(([n, l]) => (
              <div key={l} className="count-box">
                <span className="count-n">{String(n).padStart(2, '0')}</span>
                <span className="count-l">{l}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="hero-actions">
        <a href="#/my" className="btn btn-gold">My Festival</a>
        <a href="#/programme" className="btn btn-outline">Programme <ArrowRight size={20} /></a>
      </div>
    </section>
  );
}

function Tiles() {
  const { scheduled } = useFestival();
  const t = useLiveClock();
  const today = openQueues(t).length;
  const tiles = [
    { href: '#/programme', Icon: CalendarDays, title: 'Programme', sub: `${FILMS.length} films, 7 days` },
    { href: '#/queues', Icon: Users, title: 'Queues', sub: `${today} open now` },
    { href: '#/my', Icon: BookmarkCheck, title: 'My Festival', sub: `${scheduled.size} in your plan` },
    { href: '#/venues', Icon: MapPin, title: 'Venues', sub: `${VENUES.length} across Lagos` },
  ];
  return (
    <div className="tiles">
      {tiles.map(({ href, Icon, title, sub }) => (
        <a key={title} href={href} className="tile">
          <span className="icon-box"><Icon size={24} strokeWidth={1.8} /></span>
          <span className="tile-text">
            <span className="tile-title">{title}</span>
            <span className="tile-sub">{sub}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function HowToAttendCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="hta-card" onClick={() => setOpen(true)}>
        <span className="icon-box"><Info size={22} strokeWidth={1.8} /></span>
        <span className="tile-text">
          <span className="tile-title">How to attend</span>
          <span className="tile-sub">Tickets, refunds, Q&amp;As and venues</span>
        </span>
        <ChevronRight size={20} className="hta-card-arrow" />
      </button>
      {open && <HowToAttend onClose={() => setOpen(false)} />}
    </>
  );
}

export function ListingCard({ screening }) {
  const film = filmById(screening.film);
  const venue = venueById(screening.venue);
  const label = queueLabel(queueAt(screening));
  return (
    <a href={`#/film/${film.id}`} className="listing">
      <Poster film={film} className="poster-sm" />
      <div className="listing-body">
        <div className="listing-top">
          <span className="listing-time">{timeLabel(screening.time)} · {runtimeLabel(film.runtime)}</span>
          {label?.text === 'Full' && <span className="full">Full</span>}
        </div>
        <span className="listing-title">{film.title}</span>
        <span className="listing-venue">
          <span className="dot" style={{ background: venue.color }} /> {venue.name}, {screening.screen}
        </span>
        <span className="cat-tag">{film.section}</span>
      </div>
    </a>
  );
}

// Masterclasses first (free, registration needed), then the big festival moments
function EventsStrip() {
  const byTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
  const learn = EVENTS.filter((e) => EVENT_TYPES[e.type].group === 'learn').sort(byTime);
  const other = EVENTS.filter((e) => EVENT_TYPES[e.type].group !== 'learn' && !isMultiDay(e) && e.type !== 'market').sort(byTime);
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">Masterclasses & events</h2>
        <a href="#/programme/events" className="link">All events <ChevronRight size={18} /></a>
      </div>
      <p className="muted small" style={{ marginTop: -6, marginBottom: 12 }}>{learn.length} free masterclasses and workshops. Register on afriff.com.</p>
      <div className="event-strip">
        {[...learn, ...other].map((e) => <EventCard key={e.id} event={e} />)}
      </div>
    </section>
  );
}

function OpeningDay() {
  const day = FESTIVAL.days[0];
  const p = dateParts(day);
  const list = SCREENINGS.filter((s) => s.date === day).slice(0, 4);
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">Opening day <span className="section-date">{p.day} {p.date} {p.month}</span></h2>
        <a href="#/programme" className="link">Full schedule <ChevronRight size={18} /></a>
      </div>
      <div className="stack">
        {list.map((s) => <ListingCard key={s.id} screening={s} />)}
      </div>
    </section>
  );
}

// One sponsor tile: the logo on a light tile (the logos are dark artwork).
// If a logo can't load, the sponsor's name shows instead.
function SponsorTile({ sponsor }) {
  const [broken, setBroken] = useState(false);
  const body = sponsor.logo && !broken
    ? <img src={sponsor.logo} alt={sponsor.name} loading="lazy" decoding="async" onError={() => setBroken(true)} />
    : <span className="sponsor-name">{sponsor.name}</span>;
  return sponsor.website
    ? <a className="sponsor" href={sponsor.website} target="_blank" rel="noopener noreferrer">{body}</a>
    : <div className="sponsor">{body}</div>;
}

function Sponsors() {
  return (
    <section className="section sponsors">
      <p className="eyebrow">Supported by</p>
      <div className="sponsor-strip">
        {SPONSORS.map((s) => <SponsorTile key={s.name} sponsor={s} />)}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="page">
      <NewsBanner />
      <Hero />
      <Tiles />
      <HowToAttendCard />
      <OpeningDay />
      <EventsStrip />
      <Sponsors />
    </div>
  );
}
