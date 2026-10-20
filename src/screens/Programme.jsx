import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, BarChart3, CalendarDays, Check, Clapperboard, Eye, Film, List, ListChecks, MapPin, Minus, Search, Sparkles, X } from 'lucide-react';
import { FESTIVAL, FILMS, SCREENINGS, SECTIONS, VENUES, filmById, venueById } from '../data/programme.js';
import { dateParts, fromMinutes, time12, timeLabel, toMinutes } from '../lib/format.js';
import { lagosDate, lagosMinutes } from '../lib/now.js';
import { AddButton, PageTitle, Poster, QueueTag, VenueDot } from '../components/Bits.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import { useFestival } from '../lib/store.jsx';
import { queueAt, useLiveClock } from '../lib/queues.js';
import { EVENTS, EVENT_FILTERS, EVENT_TYPES, isMultiDay, eventsOn } from '../data/events.js';
import { EventRow, EventThumb } from '../components/EventBits.jsx';
import { planForDay } from '../lib/plan.js';

const TAG_FILTERS = ['All', 'Public', 'Industry'];
const TYPE_FILTERS = [{ id: 'all', label: 'All' }, { id: 'films', label: 'Films' }, { id: 'events', label: 'Events' }];

// Everything on one day (screenings and events) as one list in time order.
// type: 'all' | 'films' | 'events'
function dayItems(day, type = 'all') {
  const films = type === 'events' ? [] : SCREENINGS.filter((s) => s.date === day).map((s) => {
    const film = filmById(s.film);
    const start = toMinutes(s.time);
    return { kind: 'screening', id: s.id, time: s.time, start, end: start + film.runtime, venue: s.venue, lane: s.screen, title: film.title, href: `#/film/${film.id}`, tag: s.tag, screening: s };
  });
  const events = type === 'films' ? [] : eventsOn(day).map((e) => {
    const start = toMinutes(e.time);
    let end = toMinutes(e.end);
    if (end <= start) end += 24 * 60; // runs past midnight
    return { kind: 'event', id: e.id, time: e.time, start, end, venue: e.venue, lane: e.place || 'Event', title: e.title, href: `#/event/${e.id}`, tag: e.tag || 'Public', event: e };
  });
  return [...films, ...events].sort((a, b) => a.start - b.start || (a.kind === 'screening' ? -1 : 1));
}

// Remembers your day, venues, filter and view while you open films and come back.
const today = lagosDate();
const memory = {
  day: FESTIVAL.days.includes(today) ? today : FESTIVAL.days[0],
  venues: [],
  tag: 'All',
  view: 'list',
  eventFilter: 'all',
  type: 'all',
};
function useRemembered(key) {
  const [value, setValue] = useState(memory[key]);
  const set = (v) => {
    memory[key] = v;
    setValue(v);
  };
  return [value, set];
}

// ---------- Schedule tab ----------

function DayPicker({ value, onChange }) {
  const { scheduled } = useFestival();
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('.day.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [value]);
  return (
    <div className="day-picker" ref={ref} role="tablist" aria-label="Festival day">
      {FESTIVAL.days.map((d) => {
        const p = dateParts(d);
        const on = d === value;
        const planned = planForDay(scheduled, d).length;
        return (
          <button key={d} type="button" role="tab" aria-selected={on} className={`day${on ? ' on' : ''}`} onClick={() => onChange(d)}>
            <span className="day-name">
              {p.day}
              {planned > 0 && <span className="day-badge" aria-label={`${planned} planned`}>{planned}</span>}
            </span>
            <span className="day-row">
              <span className="day-num">{String(p.date).padStart(2, '0')}</span>
              <span className="day-month">{p.monthUpper}<br />{p.year}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Tap venues on and off; more than one can be on. None on = all venues.
function VenueChips({ day, type, selected, onChange }) {
  const items = dayItems(day, type);
  const count = (vid) => items.filter((i) => i.venue === vid).length;
  const toggle = (vid) => {
    const next = selected.includes(vid) ? selected.filter((v) => v !== vid) : [...selected, vid];
    onChange(next.length === VENUES.length ? [] : next);
  };
  return (
    <div className="chips" role="group" aria-label="Venues">
      <button type="button" aria-pressed={selected.length === 0} className={`chip${selected.length === 0 ? ' on' : ''}`} onClick={() => onChange([])}>
        All venues
      </button>
      {VENUES.map((v) => {
        const on = selected.includes(v.id);
        return (
          <button key={v.id} type="button" aria-pressed={on} className={`chip${on ? ' on' : ''}`} onClick={() => toggle(v.id)}>
            <VenueDot venueId={v.id} /> {v.name} <span className="chip-count">{count(v.id)}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScreeningRow({ screening, clock }) {
  const queue = queueAt(screening, clock);
  const { isScheduled, toggleScheduled } = useFestival();
  const film = filmById(screening.film);
  const venue = venueById(screening.venue);
  const t = time12(screening.time);
  return (
    <div className="row">
      <a href={`#/film/${film.id}`} className="row-link">
        <div className="row-time">
          <span className="row-time-n">{t.time}</span>
          <span className="row-time-ampm">{t.ampm}</span>
        </div>
        <div className="row-body">
          <span className="row-title">{film.title}</span>
          <span className="venue-line"><VenueDot venueId={venue.id} /> {venue.name}</span>
          {queue && <QueueTag queue={queue} />}
          <span className="row-cat">{film.section}{screening.tag === 'Industry' ? ' · Industry' : ''}</span>
        </div>
        <Poster film={film} className="poster-thumb" />
      </a>
      <AddButton added={isScheduled(screening.id)} onClick={() => toggleScheduled(screening.id)} title={film.title} />
    </div>
  );
}

function Timeline({ items, day }) {
  const { isScheduled } = useFestival();
  const PX = 120; // pixels per hour
  const LABEL = 92; // width of the room-name column
  const scroller = useRef(null);

  const nowMin = lagosDate() === day ? lagosMinutes() : null;
  let from = Math.floor(Math.min(...items.map((i) => i.start)) / 60) * 60;
  let to = Math.ceil(Math.max(...items.map((i) => i.end)) / 60) * 60;
  if (nowMin !== null) {
    from = Math.min(from, Math.floor(nowMin / 60) * 60);
    to = Math.max(to, Math.ceil((nowMin + 1) / 60) * 60);
  }
  const hours = [];
  for (let m = from; m < to; m += 60) hours.push(m);
  const trackWidth = ((to - from) / 60) * PX;
  const x = (mins) => ((mins - from) / 60) * PX;

  // one group per cinema, plus "Other places" for events away from the cinemas
  const places = [...VENUES.map((v) => ({ id: v.id, name: v.name, color: v.color })), { id: null, name: 'Other places', color: '#DBA440' }];
  const groups = places
    .map((p) => {
      const here = items.filter((i) => (i.venue || null) === p.id);
      return { place: p, here, lanes: [...new Set(here.map((i) => i.lane))].sort() };
    })
    .filter((g) => g.here.length);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = nowMin !== null ? Math.max(0, x(nowMin) - 120) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  return (
    <div className="tl" ref={scroller}>
      <div className="tl-grid" style={{ width: LABEL + trackWidth + 16, '--px': `${PX}px` }}>
        <div className="tl-hours" style={{ marginLeft: LABEL }}>
          {hours.map((m) => (
            <span key={m} className="tl-hour" style={{ left: x(m) }}>{timeLabel(fromMinutes(m % (24 * 60))).replace(':00', '').toLowerCase()}</span>
          ))}
        </div>
        {groups.map(({ place, here, lanes }) => (
          <div key={place.id || 'other'} className="tl-group">
            <div className="tl-group-name" style={{ color: place.color }}>{place.name}</div>
            {lanes.map((lane) => (
              <div key={lane} className="tl-lane">
                <div className="tl-label" style={{ width: LABEL, borderLeftColor: place.color }}>{lane}</div>
                <div className="tl-track" style={{ width: trackWidth }}>
                  {here.filter((i) => i.lane === lane).map((i) => {
                    const mine = isScheduled(i.id);
                    return (
                      <a
                        key={i.id}
                        href={i.href}
                        className={`tl-block${mine ? ' mine' : ''}${i.kind === 'event' ? ' event' : ''}`}
                        style={{ left: x(i.start), width: Math.max(64, x(i.end) - x(i.start) - 4), background: `${place.color}24`, borderColor: `${place.color}66` }}
                      >
                        <span className="tl-block-title">{mine && <Check size={13} strokeWidth={3} />} {i.title}</span>
                        <span className="tl-block-time">{i.kind === 'event' ? `${EVENT_TYPES[i.event.type].label} · ` : ''}{timeLabel(i.time)} – {timeLabel(fromMinutes(i.end % (24 * 60)))}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
        {nowMin !== null && <div className="tl-now" style={{ left: LABEL + x(nowMin) }} aria-label="Now" />}
      </div>
    </div>
  );
}

function MyPlanSheet({ day, onClose }) {
  const { scheduled, toggleScheduled } = useFestival();
  const p = dateParts(day);
  const mine = planForDay(scheduled, day);
  return (
    <BottomSheet title="My plan" onClose={onClose}>
      <div className="plan-card">
        <div className="plan-day">{p.day} {p.month} {p.date}</div>
        {mine.length === 0 && <p className="muted small">Nothing planned for this day yet. Tap + on any screening or event to add it.</p>}
        {mine.map((item) => (
          <div key={item.id} className="plan-row">
            <span className="plan-time">{timeLabel(item.time)}</span>
            <a href={item.href} className="plan-body" onClick={onClose}>
              <span className="plan-title">{item.title}</span>
              {item.typeLabel && <span className="row-cat gold">{item.typeLabel}</span>}
              <span className="venue-line">{item.venue && <VenueDot venueId={item.venue} />} {item.where}</span>
            </a>
            <button type="button" className="round-btn small" onClick={() => toggleScheduled(item.id)} aria-label={`Remove ${item.title} from your plan`}>
              <Minus size={18} />
            </button>
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 14 }}>Leave time between films for the queue and travel across Lagos.</p>
      <a href="#/my" className="link" style={{ marginTop: 12 }} onClick={onClose}>See your whole festival →</a>
    </BottomSheet>
  );
}

function ScheduleTab() {
  const [day, setDay] = useRemembered('day');
  const [venues, setVenues] = useRemembered('venues');
  const [tag, setTag] = useRemembered('tag');
  const [view, setView] = useRemembered('view');
  const [type, setType] = useRemembered('type');
  const [planOpen, setPlanOpen] = useState(false);
  const clock = useLiveClock();
  const { scheduled } = useFestival();

  // screenings and events for the day, one row per showing, in time order
  const items = useMemo(
    () =>
      dayItems(day, type)
        .filter((i) => venues.length === 0 || (i.venue && venues.includes(i.venue)))
        .filter((i) => tag === 'All' || i.tag === tag),
    [day, type, venues, tag]
  );
  const nFilms = items.filter((i) => i.kind === 'screening').length;
  const nEvents = items.length - nFilms;
  const plannedToday = planForDay(scheduled, day).length;
  const eventsToday = eventsOn(day).length;
  const nextTag = () => setTag(TAG_FILTERS[(TAG_FILTERS.indexOf(tag) + 1) % TAG_FILTERS.length]);
  const emptyWord = tag === 'Public' ? 'public' : tag === 'Industry' ? 'for industry' : 'showing';
  // short enough to stay on one line on small phones
  const countText =
    type === 'films' ? `${nFilms} screening${nFilms === 1 ? '' : 's'}`
      : type === 'events' ? `${nEvents} event${nEvents === 1 ? '' : 's'}`
        : `${nFilms} film${nFilms === 1 ? '' : 's'} · ${nEvents} event${nEvents === 1 ? '' : 's'}`;

  return (
    <>
      <DayPicker value={day} onChange={setDay} />
      <VenueChips day={day} type={type} selected={venues} onChange={setVenues} />

      <div className="type-filter" role="group" aria-label="Show">
        {TYPE_FILTERS.map((t) => (
          <button key={t.id} type="button" aria-pressed={type === t.id} className={`chip small${type === t.id ? ' on' : ''}`} onClick={() => setType(t.id)}>
            {t.label}
          </button>
        ))}
        <span className="muted type-count">{countText}</span>
      </div>

      <div className="list-tools">
        <button type="button" className={`chip small${tag !== 'All' ? ' on' : ''}`} onClick={nextTag}>
          {tag === 'All' ? 'Public & Industry' : `${tag} only`}
        </button>
        <div className="toggle" role="group" aria-label="View">
          <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="List view"><List size={20} /></button>
          <button type="button" className={view === 'timeline' ? 'on' : ''} aria-pressed={view === 'timeline'} onClick={() => setView('timeline')} aria-label="Timeline view"><BarChart3 size={20} /></button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="empty">Nothing {emptyWord} at these venues on this day.</p>
      ) : view === 'list' ? (
        <div className="rows">
          {items.map((i) => (i.kind === 'screening'
            ? <ScreeningRow key={i.id} screening={i.screening} clock={clock} />
            : <EventRow key={i.id} event={i.event} />))}
        </div>
      ) : (
        <Timeline items={items} day={day} />
      )}
      {eventsToday > 0 && (
        <a href="#/programme/events" className="events-pointer">
          <Sparkles size={18} /> {eventsToday} masterclass{eventsToday === 1 ? '' : 'es'} & event{eventsToday === 1 ? '' : 's'} this day <span>See events →</span>
        </a>
      )}
      {/* extra bottom space so the floating My plan button never covers a row */}
      <p className="footnote" style={{ marginBottom: 64 }}>Times can change. Check the bell for updates.</p>

      <button type="button" className="fab" onClick={() => setPlanOpen(true)}>
        <ListChecks size={20} /> My plan{plannedToday > 0 && <span className="fab-count">{plannedToday}</span>}
      </button>
      {planOpen && <MyPlanSheet day={day} onClose={() => setPlanOpen(false)} />}
    </>
  );
}

// ---------- All films tab ----------

function AllFilmsTab() {
  const { isWatched, toggleWatched } = useFestival();
  const sections = [...SECTIONS, ...new Set(FILMS.map((f) => f.section).filter((s) => !SECTIONS.includes(s)))];
  return (
    <div className="all-films">
      <a href="#/jury" className="jury-pointer">
        <Award size={18} /> Competition films are judged by the International Jury <span>Meet the jury →</span>
      </a>
      {sections.map((sec) => {
        const films = FILMS.filter((f) => f.section === sec).sort((a, b) => a.title.localeCompare(b.title));
        if (films.length === 0) return null;
        return (
          <section key={sec} className="af-section">
            <h2 className="af-head">{sec} <span className="af-count">{films.length}</span></h2>
            {films.map((f) => {
              const seen = isWatched(f.id);
              const venueIds = [...new Set(SCREENINGS.filter((s) => s.film === f.id).map((s) => s.venue))];
              return (
                <div key={f.id} className="af-row">
                  <a href={`#/film/${f.id}`} className="af-link">
                    <Poster film={f} className="poster-mini" />
                    <span className="af-text">
                      <span className="af-title">{f.title}</span>
                      <span className="muted small">{f.director} · {f.country}</span>
                    </span>
                  </a>
                  <span className="af-dots" aria-label="Venues">{venueIds.map((v) => <VenueDot key={v} venueId={v} />)}</span>
                  <button type="button" className={`eye-btn${seen ? ' on' : ''}`} onClick={() => toggleWatched(f.id)} aria-pressed={seen} aria-label={seen ? `Unmark ${f.title} as seen` : `Mark ${f.title} as seen`}>
                    {seen ? <Check size={20} strokeWidth={2.4} /> : <Eye size={20} />}
                  </button>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

// ---------- Events tab ----------

function EventsTab() {
  const [filter, setFilter] = useRemembered('eventFilter');
  const show = (e) => filter === 'all' || EVENT_TYPES[e.type].group === filter;
  const allWeek = EVENTS.filter((e) => isMultiDay(e) && show(e));
  return (
    <div className="events-tab">
      <p className="muted small events-intro">Masterclasses, workshops, the AFCM market, galas and parties. Masterclasses are free; register on afriff.com.</p>
      <div className="chips" role="group" aria-label="Event type">
        {EVENT_FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} className={`chip${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {allWeek.length > 0 && (
        <section className="ev-day">
          <h2 className="ev-day-head">All week</h2>
          {allWeek.map((e) => <EventRow key={e.id} event={e} />)}
        </section>
      )}
      {FESTIVAL.days.map((d) => {
        const list = eventsOn(d).filter(show);
        if (list.length === 0) return null;
        const p = dateParts(d);
        return (
          <section key={d} className="ev-day">
            <h2 className="ev-day-head">{p.day} {p.date} {p.month}</h2>
            {list.map((e) => <EventRow key={e.id} event={e} />)}
          </section>
        );
      })}
      <p className="footnote" style={{ marginBottom: 24 }}>Times and rooms are samples until AFRIFF publishes the schedule.</p>
    </div>
  );
}

// ---------- Search ----------

function SearchScreen({ onClose }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const results = query
    ? FILMS.filter((f) => f.title.toLowerCase().includes(query) || f.director.toLowerCase().includes(query))
    : [];
  const eventResults = query
    ? EVENTS.filter((e) => e.title.toLowerCase().includes(query) || (e.speaker || '').toLowerCase().includes(query))
    : [];
  return (
    <div className="search-screen" role="dialog" aria-label="Search films, directors and events">
      <div className="search-bar">
        <div className="search-box">
          <Search size={20} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search films, directors, events" />
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search"><X size={22} /></button>
      </div>
      <div className="search-body">
        {query && results.length + eventResults.length === 0 && <p className="empty">Nothing matches “{q}”.</p>}
        {eventResults.map((e) => (
          <a key={e.id} href={`#/event/${e.id}`} className="search-result" onClick={onClose}>
            <EventThumb event={e} />
            <span>
              <span className="row-title">{e.title}</span>
              <span className="muted small">{EVENT_TYPES[e.type].label}{e.speaker ? ` · ${e.speaker}` : ''}</span>
            </span>
          </a>
        ))}
        {results.map((f) => (
          <a key={f.id} href={`#/film/${f.id}`} className="search-result" onClick={onClose}>
            <Poster film={f} className="poster-thumb" />
            <span>
              <span className="row-title">{f.title}</span>
              <span className="muted small">{f.director} · {f.country}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function Programme({ param }) {
  const tab = param === 'films' || param === 'events' ? param : 'schedule';
  const [searching, setSearching] = useState(false);

  return (
    <div className="page">
      <div className="title-row">
        <PageTitle icon={Clapperboard}>Programme</PageTitle>
        <button type="button" className="icon-btn big" onClick={() => setSearching(true)} aria-label="Search films, directors and events">
          <Search size={24} />
        </button>
      </div>
      <div className="subtitle-row">
        <span>Full festival schedule</span>
        <a href="#/venues" className="underline-link"><MapPin size={18} /> Lagos</a>
      </div>

      <div className="seg" role="tablist" aria-label="Programme view">
        <a href="#/programme" role="tab" aria-selected={tab === 'schedule'} className={tab === 'schedule' ? 'on' : ''}>
          <CalendarDays size={18} /> Schedule
        </a>
        <a href="#/programme/films" role="tab" aria-selected={tab === 'films'} className={tab === 'films' ? 'on' : ''}>
          <Film size={18} /> All films
        </a>
        <a href="#/programme/events" role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'on' : ''}>
          <Sparkles size={18} /> Events
        </a>
      </div>

      {tab === 'schedule' ? <ScheduleTab /> : tab === 'films' ? <AllFilmsTab /> : <EventsTab />}

      {searching && <SearchScreen onClose={() => setSearching(false)} />}
    </div>
  );
}
