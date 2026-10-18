import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, CalendarDays, Check, Clapperboard, Eye, Film, List, ListChecks, MapPin, Minus, Search, X } from 'lucide-react';
import { FESTIVAL, FILMS, SCREENINGS, SECTIONS, VENUES, filmById, venueById } from '../data/programme.js';
import { dateParts, fromMinutes, time12, timeLabel, toMinutes } from '../lib/format.js';
import { lagosDate, lagosMinutes } from '../lib/now.js';
import { AddButton, PageTitle, Poster, QueueTag, VenueDot } from '../components/Bits.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import { useFestival } from '../lib/store.jsx';
import { queueAt, useLiveClock } from '../lib/queues.js';

const TAG_FILTERS = ['All', 'Public', 'Industry'];
const endOf = (s) => toMinutes(s.time) + filmById(s.film).runtime;

// Remembers your day, venues, filter and view while you open films and come back.
const today = lagosDate();
const memory = {
  day: FESTIVAL.days.includes(today) ? today : FESTIVAL.days[0],
  venues: [],
  tag: 'All',
  view: 'list',
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
        const planned = SCREENINGS.filter((s) => s.date === d && scheduled.has(s.id)).length;
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
function VenueChips({ day, selected, onChange }) {
  const count = (vid) => SCREENINGS.filter((s) => s.date === day && s.venue === vid).length;
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

function Timeline({ list, day }) {
  const { isScheduled } = useFestival();
  const PX = 120; // pixels per hour
  const LABEL = 92; // width of the screen-name column
  const scroller = useRef(null);

  const nowMin = lagosDate() === day ? lagosMinutes() : null;
  let from = Math.floor(Math.min(...list.map((s) => toMinutes(s.time))) / 60) * 60;
  let to = Math.ceil(Math.max(...list.map(endOf)) / 60) * 60;
  if (nowMin !== null) {
    from = Math.min(from, Math.floor(nowMin / 60) * 60);
    to = Math.max(to, Math.ceil((nowMin + 1) / 60) * 60);
  }
  const hours = [];
  for (let m = from; m < to; m += 60) hours.push(m);
  const trackWidth = ((to - from) / 60) * PX;
  const x = (mins) => ((mins - from) / 60) * PX;

  const groups = VENUES.map((v) => ({
    venue: v,
    screens: [...new Set(list.filter((s) => s.venue === v.id).map((s) => s.screen))].sort(),
  })).filter((g) => g.screens.length);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = nowMin !== null ? Math.max(0, x(nowMin) - 120) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  return (
    <div className="tl" ref={scroller}>
      <div className="tl-grid" style={{ width: LABEL + trackWidth + 16, '--px': `${PX}px` }}>
        <div className="tl-hours" style={{ marginLeft: LABEL }}>
          {hours.map((m) => (
            <span key={m} className="tl-hour" style={{ left: x(m) }}>{timeLabel(fromMinutes(m)).replace(':00', '').toLowerCase()}</span>
          ))}
        </div>
        {groups.map(({ venue, screens }) => (
          <div key={venue.id} className="tl-group">
            <div className="tl-group-name" style={{ color: venue.color }}>{venue.name}</div>
            {screens.map((screen) => (
              <div key={screen} className="tl-lane">
                <div className="tl-label" style={{ width: LABEL, borderLeftColor: venue.color }}>{screen}</div>
                <div className="tl-track" style={{ width: trackWidth }}>
                  {list.filter((s) => s.venue === venue.id && s.screen === screen).map((s) => {
                    const film = filmById(s.film);
                    const mine = isScheduled(s.id);
                    return (
                      <a
                        key={s.id}
                        href={`#/film/${film.id}`}
                        className={`tl-block${mine ? ' mine' : ''}`}
                        style={{ left: x(toMinutes(s.time)), width: Math.max(64, x(endOf(s)) - x(toMinutes(s.time)) - 4), background: `${venue.color}24`, borderColor: `${venue.color}66` }}
                      >
                        <span className="tl-block-title">{mine && <Check size={13} strokeWidth={3} />} {film.title}</span>
                        <span className="tl-block-time">{timeLabel(s.time)} – {timeLabel(fromMinutes(endOf(s)))}</span>
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
  const mine = SCREENINGS.filter((s) => s.date === day && scheduled.has(s.id)).sort((a, b) => a.time.localeCompare(b.time));
  return (
    <BottomSheet title="My plan" onClose={onClose}>
      <div className="plan-card">
        <div className="plan-day">{p.day} {p.month} {p.date}</div>
        {mine.length === 0 && <p className="muted small">Nothing planned for this day yet. Tap + on any screening to add it.</p>}
        {mine.map((s) => {
          const film = filmById(s.film);
          return (
            <div key={s.id} className="plan-row">
              <span className="plan-time">{timeLabel(s.time)}</span>
              <a href={`#/film/${film.id}`} className="plan-body" onClick={onClose}>
                <span className="plan-title">{film.title}</span>
                <span className="venue-line"><VenueDot venueId={s.venue} /> {venueById(s.venue).name} · {s.screen}</span>
              </a>
              <button type="button" className="round-btn small" onClick={() => toggleScheduled(s.id)} aria-label={`Remove ${film.title} from your plan`}>
                <Minus size={18} />
              </button>
            </div>
          );
        })}
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
  const [planOpen, setPlanOpen] = useState(false);
  const clock = useLiveClock();
  const { scheduled } = useFestival();

  const list = useMemo(
    () =>
      SCREENINGS.filter((s) => s.date === day)
        .filter((s) => venues.length === 0 || venues.includes(s.venue))
        .filter((s) => tag === 'All' || s.tag === tag)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [day, venues, tag]
  );
  const plannedToday = SCREENINGS.filter((s) => s.date === day && scheduled.has(s.id)).length;
  const nextTag = () => setTag(TAG_FILTERS[(TAG_FILTERS.indexOf(tag) + 1) % TAG_FILTERS.length]);
  const emptyWord = tag === 'Public' ? 'public' : tag === 'Industry' ? 'for industry' : 'showing';

  return (
    <>
      <DayPicker value={day} onChange={setDay} />
      <VenueChips day={day} selected={venues} onChange={setVenues} />

      <div className="list-tools">
        <span className="muted">{list.length} screening{list.length === 1 ? '' : 's'}</span>
        <button type="button" className={`chip small${tag !== 'All' ? ' on' : ''}`} onClick={nextTag}>
          {tag === 'All' ? 'Public & Industry' : `${tag} only`}
        </button>
        <div className="toggle" role="group" aria-label="View">
          <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="List view"><List size={20} /></button>
          <button type="button" className={view === 'timeline' ? 'on' : ''} aria-pressed={view === 'timeline'} onClick={() => setView('timeline')} aria-label="Timeline view"><BarChart3 size={20} /></button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="empty">Nothing {emptyWord} at these venues on this day.</p>
      ) : view === 'list' ? (
        <div className="rows">{list.map((s) => <ScreeningRow key={s.id} screening={s} clock={clock} />)}</div>
      ) : (
        <Timeline list={list} day={day} />
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

// ---------- Search ----------

function SearchScreen({ onClose }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const results = query
    ? FILMS.filter((f) => f.title.toLowerCase().includes(query) || f.director.toLowerCase().includes(query))
    : [];
  return (
    <div className="search-screen" role="dialog" aria-label="Search films and directors">
      <div className="search-bar">
        <div className="search-box">
          <Search size={20} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search films and directors" />
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search"><X size={22} /></button>
      </div>
      <div className="search-body">
        {query && results.length === 0 && <p className="empty">No films or directors match “{q}”.</p>}
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
  const tab = param === 'films' ? 'films' : 'schedule';
  const [searching, setSearching] = useState(false);

  return (
    <div className="page">
      <div className="title-row">
        <PageTitle icon={Clapperboard}>Programme</PageTitle>
        <button type="button" className="icon-btn big" onClick={() => setSearching(true)} aria-label="Search films and directors">
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
      </div>

      {tab === 'schedule' ? <ScheduleTab /> : <AllFilmsTab />}

      {searching && <SearchScreen onClose={() => setSearching(false)} />}
    </div>
  );
}
