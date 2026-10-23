// The shapes of the festival data, shared by the attendee app, the admin
// console and the relays. They match what the admin console saves in
// Firestore and what "Publish to app" sends to phones.

/** 'YYYY-MM-DD' (a festival day, Lagos) */
export type IsoDay = string
/** 'HH:MM', 24-hour, Lagos time */
export type ClockTime = string

/** Public or Industry (AFCM market badge holders) */
export type Tag = 'Public' | 'Industry'

/** Set on a screening or event in the console; shown as a tag everywhere. '' = going ahead as planned. */
export type ItemStatus = '' | 'moved' | 'time-changed' | 'cancelled'

export type PosterStyle = 'glow' | 'stripes' | 'split'

/** Colour art used when a film has no poster image (or the link breaks) */
export interface PosterArt {
  style: PosterStyle
  a: string
  b: string
}

export interface Film {
  id: string
  title: string
  section: string
  country: string
  runtime: number
  year: number | null
  director: string
  language: string
  genre: string
  trailer: string
  synopsis: string
  image: string
  poster: PosterArt
  cast?: string
  premiere?: string
  competition?: boolean
  /** Feature on Home (daily highlight) */
  featured?: boolean
}

export interface Screening {
  id: string
  film: string
  venue: string
  screen: string
  date: IsoDay
  time: ClockTime
  tag: Tag
  capacity: number
  status?: ItemStatus
  /** Q&A with the filmmakers after this screening */
  qa?: boolean
}

export interface Venue {
  id: string
  name: string
  area?: string
  address: string
  color: string
}

export type NewsType = 'venue-change' | 'time-change' | 'cancelled' | 'sold-out' | 'news'

export interface NewsItem {
  id: string
  title: string
  body: string
  /** ISO date-time it was posted */
  time: string
  type?: NewsType | ''
  urgent?: boolean
  /** Hide the Home banner after this ISO date-time */
  until?: string
  /** The screening or event it's about (optional) */
  screening?: string
  event?: string
  url?: string
}

export type LogoStyle = 'white' | 'original' | 'knockout'

export interface Sponsor {
  name: string
  logo?: string
  logoStyle?: LogoStyle | ''
  website?: string
  order?: number
}

export interface Link {
  label: string
  url: string
}

export interface HowToSection {
  id: string
  title: string
  body: string
  link?: Link
  order?: number
}

export type EventType = 'masterclass' | 'workshop' | 'market' | 'panel' | 'gala' | 'awards' | 'party' | 'networking'
export type EventGroup = 'learn' | 'industry' | 'celebrate'

export interface FestivalEvent {
  id: string
  type: EventType
  title: string
  date: IsoDay
  /** Last day, for events running several days */
  endDate?: IsoDay
  time: ClockTime
  end: ClockTime
  /** A festival venue id, or null when it's somewhere else (see `place`) */
  venue: string | null
  place: string
  tag?: Tag
  speaker?: string
  speakerRole?: string
  bio?: string
  about: string
  access?: string
  image?: string
  link?: Link
  status?: ItemStatus
}

export interface JuryMember {
  id: string
  name: string
  roles: string
  country: string
  /** Which jury, e.g. "International Jury" */
  jury: string
  bio: string
  photo: string
  order?: number
}

/** A live queue count from the door volunteers */
export interface Queue {
  inLine: number
  seatsLeft: number
  /** ms since 1970 */
  updatedAt: number
}

export type Tone = 'good' | 'gold' | 'alert' | 'muted'

export interface ToneLabel {
  text: string
  tone: Tone
}

/** What "Publish to app" sends to phones (one JSON document) */
export interface PublishedSnapshot {
  version: number
  publishedAt?: string
  films?: Partial<Film>[]
  screenings?: Partial<Screening>[]
  events?: Partial<FestivalEvent>[]
  venues?: Partial<Venue>[]
  news?: NewsItem[]
  sponsors?: Sponsor[]
  jury?: Partial<JuryMember>[]
  howToAttend?: HowToSection[]
}
