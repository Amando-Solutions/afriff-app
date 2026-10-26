// What each kind of festival data looks like in the admin console.
// The lists and edit forms are built from these descriptions, so adding a
// field means adding one line here.
//
// Field types: text, textarea, number, url, time, day (festival day),
// select (fixed options), ref (pick from another collection), checkbox,
// color, datetime. A key with a dot ("link.url") is stored nested.

import { BUILT_IN, DAY_THEMES, FESTIVAL, SECTIONS } from '@afriff/core/data/programme';
import { BUILT_IN_EVENTS, EVENT_TYPES } from '@afriff/core/data/events';
import type { EventType } from '@afriff/core/types/festival';
import { BUILT_IN_JURY } from '@afriff/core/data/jury';
import { dayLabel, timeLabel } from '@afriff/core/utils/format';
import type { DataDoc, Refs } from './types';

export type FieldType = 'text' | 'textarea' | 'number' | 'url' | 'time' | 'day' | 'select' | 'ref' | 'checkbox' | 'color' | 'datetime';
export interface Option { value: string; label: string }
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: Option[];
  /** for type 'ref': the collection to pick from */
  ref?: CollectionName;
  /** starting value on a NEW item's form (existing items keep what they have) */
  default?: string | boolean;
}
/** form values: strings, or true/false for checkboxes */
export type FormValues = Record<string, string | boolean>;
type Doc = Partial<DataDoc> & Record<string, unknown>;
export interface CollectionDef {
  title: string;
  single: string;
  /** the field the new item's id is made from */
  idFrom?: string;
  label: (d: Doc, refs: Refs) => string;
  sub: (d: Doc, refs: Refs) => string;
  sort: (a: Doc, b: Doc) => number;
  fields: FieldDef[];
}

/** read a field as text (database values can be anything) */
const t = (v: unknown) => (v == null ? '' : String(v));
const n = (v: unknown, d = 99) => (typeof v === 'number' ? v : d);

const dayOptions: Option[] = FESTIVAL.days.map((d) => ({ value: d, label: `${dayLabel(d)} · ${DAY_THEMES[d] || ''}` }));
const tagOptions: Option[] = [{ value: 'Public', label: 'Public' }, { value: 'Industry', label: 'Industry' }];

// Shown as a tag on the item everywhere attendees see it
export const STATUS_OPTIONS: Option[] = [
  { value: 'moved', label: 'Moved (new venue or room)' },
  { value: 'time-changed', label: 'Time changed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const statusField: FieldDef = { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, hint: 'Leave empty when it is going ahead as planned. Changing it here offers to post an alert.' };

export const PREMIERE_OPTIONS = ['World Premiere', 'International Premiere', 'African Premiere', 'West African Premiere', 'Nigerian Premiere']
  .map((p) => ({ value: p, label: p }));

export const NEWS_TYPES: Option[] = [
  { value: 'venue-change', label: 'Venue change' },
  { value: 'time-change', label: 'Time change' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'sold-out', label: 'Sold out' },
  { value: 'news', label: 'News' },
];

export const COLLECTIONS: Record<CollectionName, CollectionDef> = {
  films: {
    title: 'Films', single: 'film', idFrom: 'title',
    label: (f) => t(f.title),
    sub: (f) => [t(f.director), t(f.section)].filter(Boolean).join(' · '),
    sort: (a, b) => t(a.title).localeCompare(t(b.title)),
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
      { key: 'cast', label: 'Cast (optional)', type: 'text', hint: 'Main actors, separated by commas' },
      { key: 'premiere', label: 'Premiere badge (optional)', type: 'select', options: PREMIERE_OPTIONS, hint: 'Shown as a gold badge on the film page' },
      { key: 'competition', label: 'In competition for a Globe Award', type: 'checkbox' },
      { key: 'featured', label: 'Feature on Home (daily highlight)', type: 'checkbox', hint: 'On the days this film screens, it goes first in the Home banner collage. Leave unticked and the app picks films by itself.' },
    ],
  },

  screenings: {
    title: 'Screenings', single: 'screening',
    label: (s, refs) => t(refs.films?.[t(s.film)]?.title) || t(s.film) || '(no film)',
    sub: (s, refs) => [s.date && dayLabel(t(s.date)), s.time && timeLabel(t(s.time)), t(refs.venues?.[t(s.venue)]?.name), t(s.screen)].filter(Boolean).join(' · '),
    sort: (a, b) => `${t(a.date)}${t(a.time)}`.localeCompare(`${t(b.date)}${t(b.time)}`),
    fields: [
      { key: 'film', label: 'Film', type: 'ref', ref: 'films', required: true },
      { key: 'venue', label: 'Venue', type: 'ref', ref: 'venues', required: true },
      { key: 'screen', label: 'Screen', type: 'text', required: true, hint: 'e.g. Screen 1' },
      { key: 'date', label: 'Day', type: 'day', required: true, options: dayOptions },
      { key: 'time', label: 'Start time', type: 'time', required: true },
      { key: 'tag', label: 'Public or Industry', type: 'select', required: true, options: tagOptions },
      { key: 'capacity', label: 'Seats', type: 'number', required: true },
      { key: 'qa', label: 'Q&A with the filmmakers after this screening', type: 'checkbox' },
      statusField,
    ],
  },

  events: {
    title: 'Masterclasses & events', single: 'event', idFrom: 'title',
    label: (e) => t(e.title),
    sub: (e) => [EVENT_TYPES[t(e.type) as EventType]?.label, e.date && dayLabel(t(e.date)), e.time && timeLabel(t(e.time)), t(e.speaker)].filter(Boolean).join(' · '),
    sort: (a, b) => `${t(a.date)}${t(a.time)}`.localeCompare(`${t(b.date)}${t(b.time)}`),
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
      { key: 'image', label: 'Graphic / poster image link (optional)', type: 'url', hint: 'Tall images work best (e.g. 4:5). Shown whole on the event page.' },
      { key: 'access', label: 'Who can attend', type: 'text', hint: 'e.g. Free · registration required' },
      { key: 'tag', label: 'Public or Industry', type: 'select', options: tagOptions },
      { key: 'link.label', label: 'Button text', type: 'text', hint: 'e.g. Register on afriff.com' },
      { key: 'link.url', label: 'Button link', type: 'url' },
      statusField,
    ],
  },

  venues: {
    title: 'Venues', single: 'venue', idFrom: 'name',
    label: (v) => t(v.name),
    sub: (v) => t(v.area),
    sort: (a, b) => t(a.name).localeCompare(t(b.name)),
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'area', label: 'Area', type: 'text', hint: 'e.g. Victoria Island' },
      { key: 'address', label: 'Full address (used for Directions)', type: 'text', required: true },
      { key: 'color', label: 'Dot colour', type: 'color', required: true },
    ],
  },

  news: {
    title: 'News & alerts', single: 'news item',
    label: (d) => `${d.urgent ? '⚠ ' : ''}${t(d.title)}`,
    sub: (d) => (d.time ? new Date(t(d.time)).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : ''),
    sort: (a, b) => t(b.time).localeCompare(t(a.time)),
    fields: [
      { key: 'title', label: 'Headline', type: 'text', required: true },
      { key: 'body', label: 'Message', type: 'textarea', required: true },
      { key: 'type', label: 'Type', type: 'select', options: NEWS_TYPES, hint: 'Shown as a coloured tag. Leave empty for general news.' },
      { key: 'urgent', label: 'Urgent (shows as a banner at the top of Home)', type: 'checkbox' },
      { key: 'until', label: 'Show the banner until (optional)', type: 'datetime', hint: 'After this time the banner disappears, but the item stays in News.' },
      { key: 'screening', label: 'About this screening (optional)', type: 'ref', ref: 'screenings' },
      { key: 'event', label: 'About this event (optional)', type: 'ref', ref: 'events' },
      { key: 'time', label: 'Date and time (Lagos)', type: 'datetime', required: true },
      { key: 'url', label: 'Link for more (optional)', type: 'url' },
      {
        key: 'push', label: 'Send as a push notification to phones with alerts on', type: 'checkbox', default: true,
        hint: 'Sent once, when this is next published (Publish to app). Editing it later never sends it again.',
      },
    ],
  },

  sponsors: {
    title: 'Sponsors', single: 'sponsor',
    label: (s) => t(s.name),
    sub: (s) => (typeof s.order === 'number' ? `Position ${s.order + 1}` : ''),
    sort: (a, b) => n(a.order) - n(b.order),
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
    label: (j) => t(j.name),
    sub: (j) => [t(j.jury), t(j.country)].filter(Boolean).join(' · '),
    sort: (a, b) => t(a.jury).localeCompare(t(b.jury)) || n(a.order) - n(b.order),
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
    label: (h) => t(h.title),
    sub: (h) => (typeof h.order === 'number' ? `Position ${h.order + 1}` : ''),
    sort: (a, b) => n(a.order) - n(b.order),
    fields: [
      { key: 'title', label: 'Heading', type: 'text', required: true },
      { key: 'body', label: 'Text', type: 'textarea', required: true },
      { key: 'link.label', label: 'Link text (optional)', type: 'text' },
      { key: 'link.url', label: 'Link (optional)', type: 'url' },
      { key: 'order', label: 'Position (0 = first)', type: 'number' },
    ],
  },
};

export type CollectionName = 'films' | 'screenings' | 'events' | 'venues' | 'news' | 'sponsors' | 'jury' | 'howToAttend';
export const isCollection = (c: string | undefined): c is CollectionName => Boolean(c && c in COLLECTIONS);

export const COLLECTION_ORDER: CollectionName[] = ['films', 'screenings', 'events', 'venues', 'news', 'sponsors', 'jury', 'howToAttend'];

// ---------- Reading and writing dotted keys like "link.url" ----------
export const getField = (obj: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o != null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);

// Turn form values (all strings) into a clean document for the database
export function fromForm(colName: CollectionName, values: FormValues): Record<string, unknown> & { link?: { url?: string } } {
  const out: Record<string, unknown> & { link?: { url?: string } } = {};
  for (const f of COLLECTIONS[colName].fields) {
    const raw = values[f.key];
    let v: unknown;
    if (f.type === 'number') v = raw === '' || raw == null ? null : Number(raw);
    else if (f.type === 'checkbox') v = Boolean(raw);
    else if (f.type === 'datetime') v = raw ? new Date(`${raw}:00+01:00`).toISOString() : '';
    else v = (raw ?? '').toString().trim();
    const parts = f.key.split('.');
    const [outer, inner] = parts;
    if (outer && inner) {
      const nested = (out[outer] as Record<string, unknown> | undefined) || {};
      nested[inner] = v;
      out[outer] = nested;
    } else {
      out[f.key] = v;
    }
  }
  // drop an empty link entirely
  if (out.link && !out.link.url) delete out.link;
  return out;
}

// The starting values for a new item's form
export const newItemDefaults = (colName: CollectionName): Record<string, unknown> =>
  Object.fromEntries(COLLECTIONS[colName].fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default]));

// Turn a stored document into form values (strings)
export function toForm(colName: CollectionName, doc: unknown): FormValues {
  const values: FormValues = {};
  for (const f of COLLECTIONS[colName].fields) {
    const v = getField(doc, f.key);
    if (f.type === 'checkbox') values[f.key] = Boolean(v);
    else if (f.type === 'datetime') {
      values[f.key] = v ? new Date(String(v)).toLocaleString('sv-SE', { timeZone: 'Africa/Lagos' }).slice(0, 16).replace(' ', 'T') : '';
    } else values[f.key] = v == null ? '' : String(v);
  }
  return values;
}

export const slugify = (s: string | null | undefined) =>
  (s || 'item').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';

// ---------- The built-in data, ready to load into the database ----------
const strip = <T extends { id: string }>({ id: _id, ...rest }: T) => rest;
export function seedData(): Record<CollectionName, [string, Record<string, unknown>][]> {
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
