// EVENTS: everything that isn't a film screening (masterclasses, workshops,
// the AFCM market, galas, awards, networking).
// Facts (titles, speakers, dates of market/gala/awards/party) from
// afriff.com on 19 Oct 2026. Descriptions and bios are short summaries
// written for this app. TIMES AND ROOMS ARE SAMPLES until AFRIFF publishes them.

export const EVENT_TYPES = {
  masterclass: { label: 'Masterclass', group: 'learn' },
  workshop: { label: 'Workshop', group: 'learn' },
  market: { label: 'Market', group: 'industry' },
  panel: { label: 'Panel', group: 'industry' },
  gala: { label: 'Gala', group: 'celebrate' },
  awards: { label: 'Awards', group: 'celebrate' },
  party: { label: 'Party', group: 'celebrate' },
  networking: { label: 'Networking', group: 'celebrate' },
};

// Filter chips on the Events tab
export const EVENT_FILTERS = [
  { id: 'all', label: 'All events' },
  { id: 'learn', label: 'Masterclasses & workshops' },
  { id: 'industry', label: 'Market & panels' },
  { id: 'celebrate', label: 'Galas & parties' },
];

const MASTERCLASS_URL = 'https://afriff.com/program/masterclasses';
const FREE = 'Free · registration required';
const register = { label: 'Register on afriff.com', url: MASTERCLASS_URL };

export let EVENTS = [
  // ---------- All week ----------
  {
    id: 'festival-meetups', type: 'networking', title: 'Festival meetups',
    date: '2026-11-01', endDate: '2026-11-06', time: '20:30', end: '23:00', venue: null, place: 'Around the festival venues',
    about: 'Informal evenings through the festival week to meet filmmakers, guests and fellow film lovers. Come as you are.',
    access: 'Open to all',
  },

  // ---------- Sun 1 Nov: Opening Night ----------
  {
    id: 'opening-gala', type: 'gala', title: 'Opening Gala',
    date: '2026-11-01', time: '17:30', end: '19:00', venue: 'landmark', place: 'Red carpet',
    about: 'The red carpet and official opening of AFRIFF 15, before the opening film, Lady, by Olive Nwosu.',
    access: 'Details coming soon',
    link: { label: 'Tickets on afriff.com', url: 'https://afriff.com/tickets' },
  },

  // ---------- AFCM market, Mon 2 – Thu 5 Nov at Twinwaters ----------
  ...['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((date, i) => ({
    id: `afcm-day-${i + 1}`, type: 'market', title: `AFCM Film & Content Market · Day ${i + 1}`,
    date, time: '10:00', end: '18:00', venue: 'twinwaters', place: 'Market floor', tag: 'Industry',
    about: 'Nigeria\'s film market, where producers meet investors, distributors and streamers. Theme: "Frames of the Future: Africa\'s Creative Intelligence". Four days spanning Film & TV, Nollywood, Innovation and Diaspora, plus the first Investment Roundtables.',
    access: 'Industry or VIP Market Badge',
    link: { label: 'Market badges on afriff.com', url: 'https://afriff.com/tickets' },
  })),

  // ---------- Masterclasses & workshops (free, registration required) ----------
  {
    id: 'ai-filmmaking', type: 'masterclass', title: 'AI Filmmaking: Storytelling in the Age of Artificial Intelligence',
    image: '/masterclasses/ai-filmmaking-obinna-okerekeocha.jpg',
    date: '2026-11-02', time: '10:00', end: '12:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Obinna Okerekeocha', speakerRole: 'Founder, Nigerian AI Film Festival',
    about: 'Practical AI tools for every stage of filmmaking, from script to distribution, and the creative and ethical questions they raise for African storytellers.',
    bio: 'Creative director and filmmaker who founded NAIJA AIFF, Nigeria\'s first festival for AI-made films.',
    access: FREE, link: register,
  },
  {
    id: 'acting-masterclass', type: 'masterclass', title: 'Acting Masterclass: Craft, Character and Command of the Screen',
    image: '/masterclasses/acting-rmd.jpg',
    date: '2026-11-02', time: '14:00', end: '16:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Richard Mofe-Damijo (RMD)', speakerRole: 'Actor and producer',
    about: 'Character preparation, emotional truth and staying compelling across a long career, from one of Nollywood\'s best-known leading men.',
    bio: 'Actor, producer and former journalist with more than 40 years on stage and screen, including The Wedding Party.',
    access: FREE, link: register,
  },
  {
    id: 'animation-workshop', type: 'workshop', title: 'Animation Workshop: Building Worlds Frame by Frame',
    image: 'https://afriff-revival.lovable.app/__l5e/assets-v1/6d2de55b-affb-475a-b672-71ba87c50ddd/animation-workshop.jpg',
    date: '2026-11-03', time: '10:00', end: '12:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Esther Kemi Gbadamosi', speakerRole: 'Founder & Creative Director, Radioxicity',
    about: 'Characters, world-building and production pipelines for original African animation. In partnership with TheCOLOREDANIME.',
    bio: 'Leads Radioxicity, a studio making original animation and design work.',
    access: FREE, link: register,
  },
  {
    id: 'directing-workshop', type: 'workshop', title: 'Directing Workshop: Vision, Silence and the Power of the Image',
    image: '/masterclasses/directing-cinematography-angel-kristi-williams.jpg',
    date: '2026-11-03', time: '12:30', end: '14:30', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Angel Kristi Williams', speakerRole: 'Film and TV director',
    about: 'How a director builds a visual language, works with actors and tells stories through restraint.',
    bio: 'Director of Really Love (SXSW, Netflix) and an NAACP Image Award winner for Colin in Black and White.',
    access: FREE, link: register,
  },
  {
    id: 'cinematography-workshop', type: 'workshop', title: 'Cinematography Workshop: Light, Composition and Visual Storytelling',
    image: '/masterclasses/directing-cinematography-erin-g-wesley.jpg',
    date: '2026-11-03', time: '15:00', end: '17:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Erin G. Wesley', speakerRole: 'Cinematographer',
    about: 'Using light, framing and camera movement to carry a story, and how to train your eye behind the camera.',
    access: FREE, link: register,
  },
  {
    id: 'costume-workshop', type: 'workshop', title: 'Costume Design for Film: Character, Culture and Visual Storytelling',
    image: '/masterclasses/costume-yolanda-okereke.jpg',
    date: '2026-11-04', time: '10:00', end: '12:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Yolanda Okereke', speakerRole: 'Costume designer',
    about: 'From script and research to fabric, colour and cultural authenticity: how costumes build character.',
    bio: 'Costume designer on The Wedding Party, King of Boys, Blood Sisters and House of Ga\'a.',
    access: FREE, link: register,
  },
  {
    id: 'actors-workshop', type: 'workshop', title: 'Acting for the Screen: Craft, Character and Performance',
    image: '/masterclasses/actors-hilda-dokubo.jpg',
    date: '2026-11-04', time: '12:30', end: '14:30', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Hilda Dokubo', speakerRole: 'Actor and producer',
    about: 'A hands-on session for emerging performers on character, emotion, reading a script and believable screen acting.',
    bio: 'AMAA-winning actor, producer and advocate whose credits include Stigma, The CEO and Kill Boro.',
    access: FREE, link: register,
  },
  {
    id: 'producers-masterclass', type: 'masterclass', title: 'Producing Masterclass: From Idea to Box Office',
    image: 'https://afriff-revival.lovable.app/__l5e/assets-v1/248736bf-a286-4e96-a3ed-315f35ff0ded/producers-masterclass.jpg',
    date: '2026-11-05', time: '10:00', end: '12:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Femi Adebayo', speakerRole: 'Actor, producer and director',
    about: 'The producer\'s path from first idea to a profitable release: scripts, finance, crew, production and delivery.',
    bio: 'Known for King of Thieves (Agesinkole), Battle on Buka Street and Seven Doors, and a champion of Yoruba-language film.',
    access: FREE, link: register,
  },
  {
    id: 'editing-workshop', type: 'workshop', title: 'Film Editing Workshop: Rhythm, Emotion and Finding the Film',
    image: '/masterclasses/film-editing-chuka-ejorh.jpg',
    date: '2026-11-05', time: '12:30', end: '14:30', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Chuka Ejorh', speakerRole: 'Founder, Blink Studios',
    about: 'Shaping performance, structure and pace in the edit, and building a career in the cutting room. In partnership with Blink Studios.',
    access: FREE, link: register,
  },
  {
    id: 'writers-workshop', type: 'workshop', title: 'Writers Workshop',
    image: '/masterclasses/writers-tunde-babalola.jpg',
    date: '2026-11-04', time: '15:00', end: '17:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Tunde Babalola', speakerRole: 'Award-winning writer and producer',
    about: 'Writing for the screen: finding the story, building structure and characters, and getting a script ready for production.',
    access: FREE, link: register,
  },
  {
    id: 'makeup-workshop', type: 'workshop', title: 'Makeup for Film and Television',
    image: '/masterclasses/makeup-alakpa-uduoghene.jpg',
    date: '2026-11-05', time: '15:00', end: '17:00', venue: 'twinwaters', place: 'Masterclass room',
    speaker: 'Alakpa Uduoghene', speakerRole: 'CEO, Beautify by UDU Studios',
    about: 'Screen makeup for character, continuity and camera: skin prep, products, lighting and working with costume.',
    bio: 'Runs Beautify by UDU Studios, creating makeup for clients and screen productions.',
    access: FREE, link: register,
  },

  // ---------- Day themes ----------
  {
    id: 'women-in-film', type: 'panel', title: 'Women in Film: Panels & Networking',
    date: '2026-11-04', time: '16:00', end: '18:30', venue: 'twinwaters', place: 'Panel room',
    about: 'Conversations with women shaping African cinema, followed by networking. Part of the festival\'s Women in Film day.',
    access: 'Details coming soon',
  },
  {
    id: 'canex-wknd', type: 'party', title: 'AFRIFF x CANEX WKND',
    date: '2026-11-06', time: '16:00', end: '23:00', venue: null, place: 'Venue to be announced',
    about: 'Music, culture and creator showcases with CANEX by Afreximbank.',
    access: 'Details coming soon',
  },
  {
    id: 'globe-awards', type: 'awards', title: 'AFRIFF Globe Awards',
    date: '2026-11-07', time: '19:00', end: '22:00', venue: null, place: 'Venue to be announced',
    about: 'The closing ceremony honouring the year\'s best features, documentaries and shorts, chosen by the jury and the audience.',
    access: 'Details coming soon',
  },
  {
    id: 'closing-party', type: 'party', title: 'Closing Party',
    date: '2026-11-07', time: '22:00', end: '02:00', venue: null, place: 'After the Globe Awards',
    about: 'The last night of AFRIFF 15, with a party after the Globe Awards.',
    access: 'Details coming soon',
  },
];

export const eventById = (id) => EVENTS.find((e) => e.id === id);
export const isMultiDay = (e) => Boolean(e.endDate && e.endDate !== e.date);
// Single-day events on a given day (multi-day ones are shown under "All week")
export const eventsOn = (date) => EVENTS.filter((e) => !isMultiDay(e) && e.date === date).sort((a, b) => a.time.localeCompare(b.time));

// Values we shipped earlier and have since corrected from AFRIFF's own
// graphics. "Add missing festival data" swaps each one for the new value,
// but only while the database still holds exactly the old value (so
// anything the team typed is never touched).
export const REPLACED_VALUES = {
  'cinematography-workshop': { image: 'https://afriff-revival.lovable.app/__l5e/assets-v1/010d239f-7f93-45e5-ba45-ae157f169454/cinematography-workshop.jpg', speaker: 'Kirby Griffin', bio: 'Self-taught director of photography who has shot for BET, Revolt TV and HBO.' },
  'editing-workshop': {
    image: 'https://afriff-revival.lovable.app/__l5e/assets-v1/923196fa-6434-415f-8852-e5063d04879c/film-editing-workshop-2026.jpg', speaker: 'Steve Sodiya', speakerRole: 'Film editor',
    bio: 'Veteran editor of King of Boys who has worked with Kunle Afolayan and Tunde Kelani.', about: 'Shaping performance, structure and pace in the edit, and building a career in the cutting room.',
  },
};

// Old graphic links replaced by AFRIFF's files in public/masterclasses
export const REPLACED_LINKS = [
  'https://afriff-revival.lovable.app/__l5e/assets-v1/7f158796-7ceb-4f1a-b2e2-d74522d76b87/acting-masterclass-rmd.jpg',
  'https://afriff-revival.lovable.app/__l5e/assets-v1/7be2c5c5-9b2f-4b35-970e-d56afb07bd53/actors-workshop-hilda-dokubo.jpg',
  'https://afriff-revival.lovable.app/__l5e/assets-v1/f61d2ef6-e314-49f5-a78f-689479206227/ai-filmmaking-workshop.jpg',
  'https://afriff-revival.lovable.app/__l5e/assets-v1/6fd4e66b-326a-4784-8987-d89eec367434/costume-design-workshop-2026.jpg',
  'https://afriff-revival.lovable.app/__l5e/assets-v1/31cb0ca8-47c5-48bb-95ce-462ef43327cf/directing-workshop.jpg',
  'https://afriff-revival.lovable.app/__l5e/assets-v1/d04e34a4-b991-4e4f-9677-1befb0073bf4/makeup-workshop-2026.jpg',
];

// ---------- Live data (build step 3) ----------
export const BUILT_IN_EVENTS = EVENTS;

// Swap in the events an admin published from the console.
export function replaceEvents(list, venueIds) {
  EVENTS = list
    .filter((e) => e.id && e.title && e.date && e.time)
    .map((e) => ({
      ...e,
      type: EVENT_TYPES[e.type] ? e.type : 'networking',
      venue: venueIds.has(e.venue) ? e.venue : null,
      end: e.end || e.time,
      about: e.about || '',
      access: e.access || '',
      place: e.place || '',
    }));
}
