// Turns AFRIFF's schedule sheet (afriff-2026-schedule.json) into screening
// records, matching each title to a film in the database. Pure code: no
// database access here, so it can be tried on its own.

// Sheet title → film ID, for titles the sheet spells differently from the
// database. Keys are normalised (see norm). Add a line here if the dry run
// can't match a title.
export const ALIASES = {
  'we are hazda': 'we-are-hadza',
  'sentimental values': 'sentimental-value',
  'if i go they will miss me': 'if-i-go-will-they-miss-me',
  'suya a spicey piece of home': 'suya-a-spicy-piece-of-home',
  'dawayer': 'dawayer-the-fallen-angel',
  // CHECK with AFRIFF: taken to be the same film (the sheet drops "Mother")
  'the memory of cleo': 'the-memory-of-mother-cleo',
};

// Sheet titles that look like a film in the database but are a different
// film. Without a line here (or in ALIASES), --add-missing won't create them,
// so nothing gets a second film page by mistake. Keys normalised (see norm).
export const DIFFERENT_FILMS = new Set([]);

// Films in the sheet that aren't in the database get a title-only record with
// --add-missing, in this section until the team fills in the details in the
// console. It must be in SECTIONS (packages/core/src/data/programme.ts), or the
// console can't save these films.
export const NEW_FILM_SECTION = 'Also screening';

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
// "NOLLYWOOD:THE UNTOLD STORY" → "Nollywood: The Untold Story"
export function titleCase(s) {
  const clean = s.replace(/\s*:\s*/g, ': ').replace(/\s+/g, ' ').trim();
  return clean.split(' ').map((w, i, all) => {
    const lower = w.toLowerCase();
    if (/\d/.test(w)) return w.toUpperCase();
    const prev = all[i - 1] || '';
    if (i > 0 && SMALL.has(lower) && !prev.endsWith(':')) return lower;
    return lower.replace(/^(['"‘’]?)(\p{L})/u, (_, q, c) => q + c.toUpperCase());
  }).join(' ');
}
export const slug = (s) => norm(s).replace(/ /g, '-');

const minutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Length of the sheet's slot for a title (the most common one if it plays in
// slots of different lengths). Used as the running time of films that have
// none yet, so their end times aren't the same as their start times.
export function slotMinutes(sheet, title) {
  const seen = {};
  for (const s of sheet.screenings) {
    if (s.title !== title || !s.slotEnd) continue;
    const m = minutes(s.slotEnd) - minutes(s.time);
    if (m > 0) seen[m] = (seen[m] || 0) + 1;
  }
  const best = Object.entries(seen).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0];
  return best ? Number(best[0]) : 0;
}

// Seats per screen at Filmhouse Landmark. NOT in the sheet: placeholders until
// AFRIFF / Filmhouse give the real numbers. Door volunteers can still type the
// real seat count when they start counting.
export const SEATS = { 'Screen 1': 100, 'Screen 3': 100, 'Screen 4': 100, 'Screen 5': 100, 'Screen TBC': 100 };

export function norm(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bigrams(s) {
  const t = s.replace(/ /g, '');
  const out = new Map();
  for (let i = 0; i < t.length - 1; i++) out.set(t.slice(i, i + 2), (out.get(t.slice(i, i + 2)) || 0) + 1);
  return out;
}
export function similarity(a, b) {
  const A = bigrams(a), B = bigrams(b);
  let both = 0, total = 0;
  for (const [k, n] of A) { both += Math.min(n, B.get(k) || 0); total += n; }
  for (const n of B.values()) total += n;
  return total ? (2 * both) / total : 0;
}

// "SOYAYA da JINI (love and blood)" → ["soyaya da jini", "love and blood"]
function otherTitles(title) {
  const m = String(title ?? '').match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  return m ? [norm(m[1]), norm(m[2])].filter(Boolean) : [];
}

// Every word that matters in a is also in b ("the memory of cleo" / "the memory of mother cleo")
function wordsIn(a, b) {
  const words = a.split(' ').filter((w) => !SMALL.has(w));
  const other = new Set(b.split(' '));
  return words.length >= 2 && words.every((w) => other.has(w));
}

// → { film, how: 'alias' | 'earlier load' | 'exact' | 'id' | 'starts' | 'other title' | 'close' }
//   or { film: null, suggestions, why, likely } (likely = looks like one of the suggestions)
export function matchTitle(title, films) {
  const n = norm(title);
  const byId = new Map(films.map((f) => [f.id, f]));
  if (ALIASES[n] && byId.has(ALIASES[n])) return { film: byId.get(ALIASES[n]), how: 'alias' };
  // a film an earlier --add-missing made for this title, even if the team renamed it since
  const earlier = films.filter((f) => f.sheetTitle && norm(f.sheetTitle) === n);
  if (earlier.length === 1) return { film: earlier[0], how: 'earlier load' };
  const exact = films.filter((f) => norm(f.title) === n);
  if (exact.length === 1) return { film: exact[0], how: 'exact' };
  if (exact.length > 1) return { film: null, suggestions: exact, why: 'several films have this title', likely: true };
  // the console makes a film's ID from its title, so this is the same film under a newer title
  if (byId.has(slug(title))) return { film: byId.get(slug(title)), how: 'id' };
  // "Ife Ati Iku" → "Ìfẹ́ àti Ikú (Love and Death)"; only for 2+ word titles, whole words
  if (n.split(' ').length >= 2) {
    const starts = films.filter((f) => { const m = norm(f.title); return m.startsWith(n + ' ') || n.startsWith(m + ' '); });
    if (starts.length === 1) return { film: starts[0], how: 'starts' };
  }
  // "LOVE AND BLOOD" → "SOYAYA da JINI (love and blood)"
  const other = films.filter((f) => otherTitles(f.title).includes(n));
  if (other.length === 1) return { film: other[0], how: 'other title' };
  const ranked = films.map((f) => ({ f, s: similarity(n, norm(f.title)) })).sort((a, b) => b.s - a.s);
  const [best, next] = ranked;
  if (best && best.s >= 0.85 && (!next || best.s - next.s >= 0.1)) return { film: best.f, how: 'close' };
  const likely = ranked.slice(0, 3).filter((r) => r.s >= 0.7 || wordsIn(n, norm(r.f.title)) || wordsIn(norm(r.f.title), n));
  return {
    film: null,
    suggestions: (likely.length ? likely : ranked.slice(0, 3)).map((r) => r.f),
    why: 'no film with this title',
    likely: likely.length > 0 && !DIFFERENT_FILMS.has(n),
  };
}

const screenNo = (screen) => (screen === 'Screen TBC' ? 'tbc' : screen.replace(/\D/g, ''));
const byScreen = (a, b) => Number(screenNo(a)) - Number(screenNo(b)) || a.localeCompare(b);

// ["Screen 1", "Screen 3"] → "Screens 1 & 3"; four → "Screens 1, 3, 4 & 5"
export function screensLabel(screens) {
  if (screens.length === 1) return screens[0];
  const nos = screens.map((s) => s.replace(/^Screen\s*/i, ''));
  return `Screens ${nos.slice(0, -1).join(', ')} & ${nos.at(-1)}`;
}

// sch-<MMDD>-<screens>-<HHMM>, e.g. sch-1102-s4s5-1300 (one record for both screens)
export function screeningId({ date, time, screens }) {
  const where = screens.map((s) => (screenNo(s) === 'tbc' ? 'tbc' : `s${screenNo(s)}`)).join('');
  return `sch-${date.slice(5).replace('-', '')}-${where}-${time.replace(':', '')}`;
}

const DAY = /^2026-11-0[1-7]$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// sheet: the JSON file; films: [{id, title, runtime}] from the database
export function buildPlan(sheet, films) {
  for (const s of sheet.screenings) {
    if (!DAY.test(s.date) || !TIME.test(s.time) || (s.slotEnd && !TIME.test(s.slotEnd)) || !s.screen) {
      throw new Error(`Sheet row ${s.row} (${s.title}): needs a festival day, an HH:MM time and a screen`);
    }
  }
  const matches = new Map();
  for (const s of sheet.screenings) if (!matches.has(s.title)) matches.set(s.title, matchTitle(s.title, films));
  const unmatched = [...matches].filter(([, m]) => !m.film);

  // The sheet often plays one film on two (or four) screens at the same time.
  // That's one showing for attendees, so it becomes ONE screening: one row on
  // the Schedule, one + button, one queue at the door, with the seats of all
  // its screens. Without this, attendees would see the film twice at that time.
  const groups = new Map();
  for (const s of sheet.screenings) {
    const m = matches.get(s.title);
    if (!m.film) continue;
    const key = `${s.date} ${s.time} ${m.film.id}`;
    const g = groups.get(key) || { film: m.film, date: s.date, time: s.time, screens: [], slotEnd: '', invitationOnly: false, rows: [] };
    if (g.screens.includes(s.screen)) throw new Error(`Sheet rows ${g.rows.join(', ')} and ${s.row}: ${s.title} twice on ${s.screen} at ${s.date} ${s.time}`);
    g.screens.push(s.screen);
    if (s.slotEnd && s.slotEnd > g.slotEnd) g.slotEnd = s.slotEnd;
    g.invitationOnly ||= Boolean(s.invitationOnly);
    g.rows.push(s.row);
    groups.set(key, g);
  }

  const screenings = [];
  const warnings = [];
  const invitationOnly = [];
  for (const g of groups.values()) {
    g.screens.sort(byScreen);
    const doc = {
      id: screeningId(g), film: g.film.id, venue: sheet.venue, screen: screensLabel(g.screens),
      date: g.date, time: g.time, tag: 'Public',
      capacity: g.screens.reduce((sum, s) => sum + (SEATS[s] ?? 100), 0), status: '',
      // from the sheet; the app doesn't show it yet
      invitationOnly: g.invitationOnly,
    };
    if (g.invitationOnly) invitationOnly.push(`${g.date} ${g.time} ${g.film.title} (${doc.screen})`);
    screenings.push(doc);
    if (g.slotEnd && g.film.runtime && minutes(g.time) + g.film.runtime > minutes(g.slotEnd) + 5) {
      warnings.push(`${g.date} ${doc.screen} ${g.time} ${g.film.title}: runs ${g.film.runtime} min, slot ends ${g.slotEnd}`);
    }
  }

  // Two different films whose slots overlap on the same screen: a typo in the sheet
  const perScreen = new Map();
  for (const g of groups.values()) {
    for (const screen of g.screens) {
      if (screen === 'Screen TBC') continue;
      const k = `${g.date} ${screen}`;
      perScreen.set(k, [...(perScreen.get(k) || []), g]);
    }
  }
  for (const [k, list] of perScreen) {
    list.sort((a, b) => minutes(a.time) - minutes(b.time));
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (a.slotEnd && minutes(a.slotEnd) > minutes(b.time)) {
        warnings.push(`${k}: ${a.film.title} (${a.time}-${a.slotEnd}) overlaps ${b.film.title} (${b.time})`);
      }
    }
  }

  const ids = new Set();
  for (const s of screenings) {
    if (ids.has(s.id)) throw new Error(`Two screenings would share the ID ${s.id}`);
    ids.add(s.id);
  }
  screenings.sort((a, b) => `${a.date}${a.time}${a.screen}`.localeCompare(`${b.date}${b.time}${b.screen}`));
  return { matches, unmatched, screenings, warnings, invitationOnly, merged: [...groups.values()].filter((g) => g.screens.length > 1).length };
}
