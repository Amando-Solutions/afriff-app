// What each kind of festival data looks like in the admin console.
// The lists and edit forms are built from these descriptions, so adding a
// field means adding one line here.
//
// Field types: text, textarea, number, url, time, day (festival day),
// select (fixed options), ref (pick from another collection), checkbox,
// color, datetime. A key with a dot ("link.url") is stored nested.

import { BUILT_IN, DAY_THEMES, FESTIVAL, SECTIONS } from '../data/programme.js';
import { BUILT_IN_EVENTS, EVENT_TYPES } from '../data/events.js';
import { BUILT_IN_JURY } from '../data/jury.js';
import { dayLabel, timeLabel } from '../lib/format.js';

const dayOptions = FESTIVAL.days.map((d) => ({ value: d, label: `${dayLabel(d)} · ${DAY_THEMES[d] || ''}` }));
const tagOptions = [{ value: 'Public', label: 'Public' }, { value: 'Industry', label: 'Industry' }];

export const COLLECTIONS = {
  films: {
    title: 'Films', single: 'film', idFrom: 'title',
    label: (f) => f.title,
    sub: (f) => [f.director, f.section].filter(Boolean).join(' · '),
    sort: (a, b) => (a.title || '').localeCompare(b.title || ''),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'director', label: 'Director(s)', type: 'text', required: true, hint: 'Separate two names with " & "' },
      { key: 'section', label: 'Programme section', type: 'select', required: true, options: SECTIONS.map((s) => ({ value: s, label: s })) },
      { key: 'genre', label: 'Genre', type: 'text' },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'language', label: 'Language', type: 'text' },
      { key: 'runtime', label: 'Running time (minutes)', type: 'number', required: true },
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'image', label: 'Poster image link', type: 'url', hint: 'Paste a link to the poster image (uploads need a paid Firebase plan)' },
      { key: 'trailer', label: 'Trailer link (YouTube or Vimeo)', type: 'url' },
      { key: 'synopsis', label: 'Synopsis', type: 'textarea' },
    ],
  },

  screenings: {
    title: 'Screenings', single: 'screening',
    label: (s, refs) => refs.films?.[s.film]?.title || s.film || '(no film)',
    sub: (s, refs) => [s.date && dayLabel(s.date), s.time && timeLabel(s.time), refs.venues?.[s.venue]?.name, s.screen].filter(Boolean).join(' · '),
    sort: (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    fields: [
      { key: 'film', label: 'Film', type: 'ref', ref: 'films', required: true },
      { key: 'venue', label: 'Venue', type: 'ref', ref: 'venues', required: true },
      { key: 'screen', label: 'Screen', type: 'text', required: true, hint: 'e.g. Screen 1' },
      { key: 'date', label: 'Day', type: 'day', required: true, options: dayOptions },
      { key: 'time', label: 'Start time', type: 'time', required: true },
      { key: 'tag', label: 'Public or Industry', type: 'select', required: true, options: tagOptions },
      { key: 'capacity', label: 'Seats', type: 'number', required: true },
    ],
  },

  events: {
    title: 'Masterclasses & events', single: 'event', idFrom: 'title',
    label: (e) => e.title,
    sub: (e) => [EVENT_TYPES[e.type]?.label, e.date && dayLabel(e.date), e.time && timeLabel(e.time), e.speaker].filter(Boolean).join(' · '),
    sort: (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    fields: [
      { key: 'type', label: 'Type', type: 'select', required: true, options: Object.entries(EVENT_TYPES).map(([value, t]) => ({ value, label: t.label })) },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'date', label: 'Day', type: 'day', required: true, options: dayOptions },
      { key: 'endDate', label: 'Last day (only for events running several days)', type: 'day', options: dayOptions },
      { key: 'time', label: 'Start time', type: 'time', required: true },
      { key: 'end', label: 'End time', type: 'time', required: true },
      { key: 'venue', label: 'Venue', type: 'ref', ref: 'venues', hint: 'Leave empty if it\'s not at one of the festival cinemas' },
      { key: 'place', label: 'Room or place', type: 'text', hint: 'e.g. Masterclass room, or the address if not at a cinema' },
      { key: 'speaker', label: 'Speaker', type: 'text' },
      { key: 'speakerRole', label: 'Speaker\'s role', type: 'text' },
      { key: 'bio', label: 'Speaker bio', type: 'textarea' },
      { key: 'about', label: 'About this event', type: 'textarea', required: true },
      { key: 'access', label: 'Who can attend', type: 'text', hint: 'e.g. Free · registration required' },
      { key: 'tag', label: 'Public or Industry', type: 'select', options: tagOptions },
      { key: 'link.label', label: 'Button text', type: 'text', hint: 'e.g. Register on afriff.com' },
      { key: 'link.url', label: 'Button link', type: 'url' },
    ],
  },

  venues: {
    title: 'Venues', single: 'venue', idFrom: 'name',
    label: (v) => v.name,
    sub: (v) => v.area,
    sort: (a, b) => (a.name || '').localeCompare(b.name || ''),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'area', label: 'Area', type: 'text', hint: 'e.g. Victoria Island' },
      { key: 'address', label: 'Full address (used for Directions)', type: 'text', required: true },
      { key: 'color', label: 'Dot colour', type: 'color', required: true },
    ],
  },

  news: {
    title: 'News & alerts', single: 'news item',
    label: (n) => `${n.urgent ? '⚠ ' : ''}${n.title}`,
    sub: (n) => (n.time ? new Date(n.time).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : ''),
    sort: (a, b) => (b.time || '').localeCompare(a.time || ''),
    fields: [
      { key: 'title', label: 'Headline', type: 'text', required: true },
      { key: 'body', label: 'Message', type: 'textarea', required: true },
      { key: 'urgent', label: 'Urgent (shows as a banner at the top of Home)', type: 'checkbox' },
      { key: 'time', label: 'Date and time (Lagos)', type: 'datetime', required: true },
      { key: 'url', label: 'Link for more (optional)', type: 'url' },
    ],
  },

  sponsors: {
    title: 'Sponsors', single: 'sponsor',
    label: (s) => s.name,
    sub: (s) => (s.order != null ? `Position ${s.order + 1}` : ''),
    sort: (a, b) => (a.order ?? 99) - (b.order ?? 99),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'logo', label: 'Logo image link', type: 'url' },
      {
        key: 'logoStyle', label: 'Logo style on the dark app', type: 'select',
        options: [
          { value: 'white', label: 'Show in white (for dark logos)' },
          { value: 'original', label: 'Keep original colours (logo already works on dark)' },
          { value: 'knockout', label: 'Remove white background (logo is a picture with a white box)' },
        ],
        hint: 'Leave empty to show in white',
      },
      { key: 'website', label: 'Website (optional, opens when the logo is tapped)', type: 'url' },
      { key: 'order', label: 'Position in the strip (0 = first)', type: 'number' },
    ],
  },

  jury: {
    title: 'Jury', single: 'jury member', idFrom: 'name',
    label: (j) => j.name,
    sub: (j) => [j.jury, j.country].filter(Boolean).join(' · '),
    sort: (a, b) => `${a.jury}`.localeCompare(`${b.jury}`) || (a.order ?? 99) - (b.order ?? 99),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'roles', label: 'Roles', type: 'text', hint: 'e.g. Producer · Media executive' },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'jury', label: 'Which jury', type: 'text', required: true, hint: 'e.g. International Jury. Members with the same jury name are shown together under that heading.' },
      { key: 'bio', label: 'Short bio', type: 'textarea' },
      { key: 'photo', label: 'Photo link', type: 'url', hint: 'If empty, their initials are shown instead' },
      { key: 'order', label: 'Position (0 = first)', type: 'number' },
    ],
  },

  howToAttend: {
    title: 'How to attend', single: 'section',
    label: (h) => h.title,
    sub: (h) => (h.order != null ? `Position ${h.order + 1}` : ''),
    sort: (a, b) => (a.order ?? 99) - (b.order ?? 99),
    fields: [
      { key: 'title', label: 'Heading', type: 'text', required: true },
      { key: 'body', label: 'Text', type: 'textarea', required: true },
      { key: 'link.label', label: 'Link text (optional)', type: 'text' },
      { key: 'link.url', label: 'Link (optional)', type: 'url' },
      { key: 'order', label: 'Position (0 = first)', type: 'number' },
    ],
  },
};

export const COLLECTION_ORDER = ['films', 'screenings', 'events', 'venues', 'news', 'sponsors', 'jury', 'howToAttend'];

// ---------- Reading and writing dotted keys like "link.url" ----------
export const getField = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// Turn form values (all strings) into a clean document for the database
export function fromForm(colName, values) {
  const out = {};
  for (const f of COLLECTIONS[colName].fields) {
    let v = values[f.key];
    if (f.type === 'number') v = v === '' || v == null ? null : Number(v);
    else if (f.type === 'checkbox') v = Boolean(v);
    else if (f.type === 'datetime') v = v ? new Date(`${v}:00+01:00`).toISOString() : '';
    else v = (v ?? '').toString().trim();
    const parts = f.key.split('.');
    if (parts.length === 2) {
      out[parts[0]] = out[parts[0]] || {};
      out[parts[0]][parts[1]] = v;
    } else {
      out[f.key] = v;
    }
  }
  // drop an empty link entirely
  if (out.link && !out.link.url) delete out.link;
  return out;
}

// Turn a stored document into form values (strings)
export function toForm(colName, doc) {
  const values = {};
  for (const f of COLLECTIONS[colName].fields) {
    let v = getField(doc, f.key);
    if (f.type === 'checkbox') v = Boolean(v);
    else if (f.type === 'datetime') {
      v = v ? new Date(v).toLocaleString('sv-SE', { timeZone: 'Africa/Lagos' }).slice(0, 16).replace(' ', 'T') : '';
    } else v = v == null ? '' : String(v);
    values[f.key] = v;
  }
  return values;
}

export const slugify = (s) =>
  (s || 'item').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';

// ---------- The built-in data, ready to load into the database ----------
const strip = ({ id, ...rest }) => rest;
export function seedData() {
  return {
    films: BUILT_IN.films.map((f) => [f.id, strip(f)]),
    screenings: BUILT_IN.screenings.map((s) => [s.id, strip(s)]),
    events: BUILT_IN_EVENTS.map((e) => [e.id, strip(e)]),
    venues: BUILT_IN.venues.map((v) => [v.id, strip(v)]),
    news: BUILT_IN.news.map((n) => [n.id, strip(n)]),
    sponsors: BUILT_IN.sponsors.map((s, i) => [slugify(s.name), { ...s, order: i }]),
    jury: BUILT_IN_JURY.map((j) => [j.id, strip(j)]),
    howToAttend: BUILT_IN.howToAttend.map((h, i) => [h.id, { ...strip(h), order: i }]),
  };
}
