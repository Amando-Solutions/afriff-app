import { useEffect, useState } from 'react';
import { AlertTriangle, Award, ChevronRight, GraduationCap, MapPin, Ticket, X } from 'lucide-react';
import HowToAttend from '../components/HowToAttend.jsx';
import SponsorMarquee from '../components/SponsorMarquee.jsx';
import { activeBanner, newsLink } from '../lib/alerts.js';
import { FESTIVAL, SCREENINGS, filmById, venueById } from '../data/programme.js';
import { dateParts, queueLabel, timeLabel } from '../lib/format.js';
import { AddButton, Poster, StatusTag } from '../components/Bits.jsx';
import { queueAt, useLiveClock } from '../lib/queues.js';
import { lagosDate, now as clockNow } from '../lib/now.js';
import { dayInfo, festivalPhase, venueShort } from '../lib/today.js';
import DailyHighlight from '../components/DailyHighlight.jsx';
import { openProgrammeDay } from './Programme.jsx';
import { useFestival } from '../lib/store.jsx';
import { EVENTS, EVENT_TYPES, isMultiDay } from '../data/events.js';
import { EventCard, EventThumb } from '../components/EventBits.jsx';

// HOME, kept simple: the bottom bar already reaches Programme, Queues and
// My Festival, so Home only shows the banner, shortcuts to the things the
// bottom bar doesn't reach, a taste of the day, events and sponsors.

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
    done: diff === 0,
  };
}

function NewsBanner() {
  // newest urgent alert that hasn't passed its "show until" time
  const urgent = activeBanner();
  const [hidden, setHidden] = useState(false);
  if (!urgent || hidden) return null;
  const link = newsLink(urgent);
  const title = /[.!?:]$/.test(urgent.title) ? urgent.title : `${urgent.title}.`;
  return (
    <div className="news-banner" role="status">
      <AlertTriangle size={20} className="news-banner-icon" />
      <a href={link?.href || '#/news'} className="news-banner-text">
        <strong>{title}</strong> {urgent.body}
        {link && <span className="news-banner-cta"> {link.label} →</span>}
      </a>
      <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setHidden(true)}>
        <X size={18} />
      </button>
    </div>
  );
}

function Hero() {
  const c = useCountdown(FESTIVAL.openingNight);
  const units = [[c.days, 'd', 'days'], [c.hours, 'h', 'hours'], [c.mins, 'm', 'minutes']];
  return (
    <section className="hero">
      <p className="hero-eyebrow">1–7 Nov 2026 · Lagos</p>
      <h2 className="hero-title">Seven days of African stories on the big screen</h2>
      {c.done ? (
        <p className="hero-sub">The festival is on. Enjoy the films!</p>
      ) : (
        <div className="countdown" aria-label={`Opening night in ${c.days} days, ${c.hours} hours and ${c.mins} minutes`}>
          <span className="countdown-label">Opening night in</span>
          {units.map(([n, short]) => (
            <span key={short} className="count-box" aria-hidden="true">
              <span className="count-n">{String(n).padStart(2, '0')}</span>
              <span className="count-l">{short}</span>
            </span>
          ))}
        </div>
      )}
      <a href="#/programme" className="btn btn-gold hero-cta">Explore the programme</a>
    </section>
  );
}

function ThankYou() {
  return (
    <section className="hero">
      <p className="hero-eyebrow">AFRIFF 2026 · That's a wrap</p>
      <h2 className="hero-title">Thank you for seven days of African stories</h2>
      <p className="hero-sub" style={{ marginTop: 12 }}>Rate the films you saw and export them to Letterboxd.</p>
      <a href="#/my" className="btn btn-gold hero-cta">Your watched list</a>
    </section>
  );
}

// Things the bottom bar doesn't reach, one word each
function Shortcuts() {
  const [howTo, setHowTo] = useState(false);
  const items = [
    { label: 'Venues', Icon: MapPin, href: '#/venues' },
    { label: 'How to attend', Icon: Ticket, onClick: () => setHowTo(true) },
    { label: 'Events', Icon: GraduationCap, href: '#/programme/events' },
    { label: 'Jury', Icon: Award, href: '#/jury' },
  ];
  return (
    <>
      <nav className="shortcuts" aria-label="Shortcuts">
        {items.map(({ label, Icon, href, onClick }) => {
          const inner = <><span className="shortcut-icon"><Icon size={22} strokeWidth={1.8} /></span><span className="shortcut-label">{label}</span></>;
          return href
            ? <a key={label} href={href} className="shortcut">{inner}</a>
            : <button key={label} type="button" className="shortcut" onClick={onClick}>{inner}</button>;
        })}
      </nav>
      {howTo && <HowToAttend onClose={() => setHowTo(false)} />}
    </>
  );
}

// One light row: poster, title, time · venue, and + to add to My Festival
function DayRow({ screening }) {
  const { isScheduled, toggleScheduled } = useFestival();
  const film = filmById(screening.film);
  const venue = venueById(screening.venue);
  const full = queueLabel(queueAt(screening))?.text === 'Full';
  return (
    <div className="home-row">
      <a href={`#/film/${film.id}`} className="home-row-link">
        <Poster film={film} className="poster-mini" />
        <span className="home-row-text">
          <span className={`home-row-title${screening.status === 'cancelled' ? ' struck' : ''}`}>{film.title}</span>
          <span className="home-row-meta">
            {timeLabel(screening.time)} · {venueShort(venue.id)}
            {full && <span className="full"> · Full</span>}
            <StatusTag status={screening.status} />
          </span>
        </span>
      </a>
      <AddButton added={isScheduled(screening.id)} onClick={() => toggleScheduled(screening.id)} title={film.title} />
    </div>
  );
}

function EventDayRow({ event }) {
  const { isScheduled, toggleScheduled } = useFestival();
  return (
    <div className="home-row">
      <a href={`#/event/${event.id}`} className="home-row-link">
        <EventThumb event={event} className="poster-mini" size={18} />
        <span className="home-row-text">
          <span className="home-row-title">{event.title.split(':')[0]}</span>
          <span className="home-row-meta">
            {timeLabel(event.time)} · {event.venue ? venueShort(event.venue) : event.place}
            <StatusTag status={event.status} />
          </span>
        </span>
      </a>
      <AddButton added={isScheduled(event.id)} onClick={() => toggleScheduled(event.id)} title={event.title} />
    </div>
  );
}

// During the festival: the next 4 things starting today (films and events)
function Today({ day, t }) {
  const p = dateParts(day);
  const { upcoming, tomorrow } = dayInfo(day, t);
  const next4 = upcoming.slice(0, 4);
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">Today <span className="section-date">{p.day} {p.date} {p.month}</span></h2>
        <a href="#/programme" className="link" onClick={() => openProgrammeDay(day)}>See all <ChevronRight size={18} /></a>
      </div>
      {next4.length === 0 ? (
        <p className="muted">Nothing else starts today.{tomorrow && <> <a className="link gold-link" href="#/programme" onClick={() => openProgrammeDay(tomorrow)}>See tomorrow</a></>}</p>
      ) : (
        <div className="home-rows">
          {next4.map((x) => (x.kind === 'screening'
            ? <DayRow key={x.item.id} screening={x.item} />
            : <EventDayRow key={x.item.id} event={x.item} />))}
        </div>
      )}
    </section>
  );
}

function OpeningDay() {
  const day = FESTIVAL.days[0];
  const p = dateParts(day);
  // the opening film always makes the cut, then the rest of the day; shown in time order
  const opening = (s) => (filmById(s.film)?.section === 'Opening Movie' ? 0 : 1);
  const list = SCREENINGS.filter((s) => s.date === day)
    .sort((a, b) => opening(a) - opening(b) || a.time.localeCompare(b.time))
    .slice(0, 4)
    .sort((a, b) => a.time.localeCompare(b.time));
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">Opening day <span className="section-date">{p.day} {p.date} {p.month}</span></h2>
        <a href="#/programme" className="link">See all <ChevronRight size={18} /></a>
      </div>
      <div className="home-rows">
        {list.map((s) => <DayRow key={s.id} screening={s} />)}
      </div>
    </section>
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
        <a href="#/programme/events" className="link">See all <ChevronRight size={18} /></a>
      </div>
      <div className="event-strip">
        {[...learn, ...other].map((e) => <EventCard key={e.id} event={e} />)}
      </div>
    </section>
  );
}

function Sponsors() {
  return (
    <section className="section sponsors">
      <p className="eyebrow">Supported by</p>
      <SponsorMarquee variant="strip" />
    </section>
  );
}

export default function Home() {
  const t = useLiveClock(60000); // redraw every minute: "Next up" and Today move on
  const phase = festivalPhase(t);
  const today = lagosDate(new Date(t));
  return (
    <div className="page">
      <NewsBanner />
      {phase === 'before' && <Hero />}
      {phase === 'during' && <DailyHighlight day={today} t={t} />}
      {phase === 'after' && <ThankYou />}
      <Shortcuts />
      {phase === 'before' && <OpeningDay />}
      {phase === 'during' && <Today day={today} t={t} />}
      <EventsStrip />
      <Sponsors />
    </div>
  );
}
