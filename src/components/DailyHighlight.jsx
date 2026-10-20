import { Clock } from 'lucide-react';
import { DAY_THEMES, filmById } from '../data/programme.js';
import { dateParts, timeLabel } from '../lib/format.js';
import { dayInfo, venueShort } from '../lib/today.js';
import { openProgrammeDay } from '../screens/Programme.jsx';
import { Poster } from './Bits.jsx';

// HOME BANNER DURING THE FESTIVAL (1–7 Nov): changes every day.
// Day N of 7 + theme, a collage of the day's films (team-picked first,
// then automatic), what's on today, what's next, and "See today".

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Collage({ films, day }) {
  if (films.length === 0) return null;
  const many = films.length > 5;
  const shown = many ? films.slice(0, 4) : films.slice(0, 5);
  const n = shown.length + (many ? 1 : 0);
  // big poster on the left; the rest fill a 2 x 2 grid (or a column when fewer)
  const style = n >= 5
    ? { gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }
    : { gridTemplateColumns: n === 1 ? '1fr' : '2fr 1fr', gridTemplateRows: `repeat(${Math.max(1, n - 1)}, 1fr)` };
  const [lead, ...rest] = shown;
  return (
    <div className="collage" style={style}>
      <a href={`#/film/${lead.id}`} className="collage-tile lead" style={{ gridRow: '1 / -1' }}>
        <Poster film={lead} className="collage-poster" />
        <span className="collage-lead-title">{lead.title}</span>
      </a>
      {rest.map((f) => (
        <a key={f.id} href={`#/film/${f.id}`} className="collage-tile" aria-label={f.title}>
          <Poster film={f} className="collage-poster" />
        </a>
      ))}
      {many && (
        <a href="#/programme" className="collage-tile collage-more" onClick={() => openProgrammeDay(day)} aria-label={`See all ${films.length} films today`}>
          +{films.length - 4}
        </a>
      )}
    </div>
  );
}

export default function DailyHighlight({ day, t }) {
  const d = dayInfo(day, t);
  const p = dateParts(day);
  const next = d.upcoming[0];
  const counts = [
    d.counts.screenings && plural(d.counts.screenings, 'screening'),
    d.counts.learn && plural(d.counts.learn, 'masterclass', 'masterclasses'),
    d.counts.other && plural(d.counts.other, 'event'),
  ].filter(Boolean);
  const seeToday = () => openProgrammeDay(day);

  let nextLine = null;
  if (next) {
    const item = next.item;
    const title = next.kind === 'screening' ? filmById(item.film)?.title : item.title.split(':')[0];
    const where = item.venue ? venueShort(item.venue) : item.place;
    const href = next.kind === 'screening' ? `#/film/${item.film}` : `#/event/${item.id}`;
    nextLine = (
      <a href={href} className="hl-next">
        <Clock size={16} />
        <span><span className="muted">Next up</span> · {timeLabel(item.time)} · <strong>{title}</strong>{where ? ` · ${where}` : ''}</span>
      </a>
    );
  } else if (d.tomorrow) {
    nextLine = <p className="hl-next done">That's a wrap for today. Tomorrow: {DAY_THEMES[d.tomorrow] || 'more films'}.</p>;
  } else {
    nextLine = <p className="hl-next done">That's a wrap on AFRIFF 2026. Thank you for coming!</p>;
  }

  return (
    <section className="hero hl">
      <div className="hl-top">
        <span className="hero-eyebrow">Today · Day {d.index + 1} of {d.total}</span>
        <span className="hl-date">{p.day} {p.date} {p.month}</span>
      </div>
      {d.theme && <h2 className="hl-theme">{d.theme}</h2>}
      <Collage films={d.films} day={day} />
      {counts.length > 0 && (
        <div className="hl-counts">{counts.map((c) => <span key={c} className="hl-count">{c}</span>)}</div>
      )}
      {nextLine}
      <a href="#/programme" className="btn btn-gold hero-cta" onClick={seeToday}>See today</a>
    </section>
  );
}
