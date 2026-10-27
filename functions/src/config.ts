// Settings for the afriff.com sync, in one place.

export const SITE = 'https://afriff.com'
/** The page whose code links the film list (the "Official Selection" page) */
export const FILMS_PAGE = `${SITE}/program`
/** Watched for the day screening times appear (afriff.com hasn't published them yet) */
export const SCHEDULE_PAGE = `${SITE}/program/schedule`
/** Said honestly in every request, so AFRIFF's web team can see who's calling */
export const USER_AGENT = 'AFRIFF-Companion-Sync/1.0 (festival companion app; checks the film list every 15 minutes)'

/** The film fields we take from afriff.com, in our database's names */
export const SYNCED_FIELDS = [
  'title', 'section', 'director', 'country', 'language', 'genre',
  'runtime', 'year', 'synopsis', 'cast', 'image', 'trailer',
] as const
export type SyncedField = (typeof SYNCED_FIELDS)[number]

/** Human words for each field, used in Approvals summaries */
export const FIELD_WORDS: Record<SyncedField, string> = {
  title: 'title', section: 'programme section', director: 'director', country: 'country',
  language: 'language', genre: 'genre', runtime: 'running time', year: 'year',
  synopsis: 'synopsis', cast: 'cast', image: 'poster', trailer: 'trailer',
}

/**
 * afriff.com lists some films twice under different addresses. Key = the
 * duplicate's address, value = our film it belongs to. The duplicate only fills
 * in what the main listing leaves empty (e.g. "Ife Ati Iku" carries the poster
 * of "Ìfẹ́ àti Ikú (Love and Death)").
 */
export const ALIASES: Record<string, string> = {
  'ife-ati-iku': 'ife-ati-iku-love-and-death',
}

/** Film fields afriff.com's code had on 26 Oct 2026. Anything new is reported (it may be screening times). */
export const KNOWN_SOURCE_KEYS = [
  'slug', 'title', 'originalTitle', 'countries', 'programme', 'runtime', 'year', 'directors', 'writers',
  'producers', 'executiveProducers', 'companies', 'cast', 'languages', 'genres', 'synopsis', 'poster',
  'trailer', 'imdb',
]

// Safety limits: if afriff.com's site breaks, change nothing and say so.
/** Fewer films than this means the list didn't load properly */
export const MIN_FILMS = 20
/** ...or fewer than this share of the films we saw last time */
export const MIN_SHARE_OF_LAST = 0.5

/** Who the Approvals page says a proposal is from */
export const SYNC_USER = { id: 'afriff-sync', name: 'afriff.com sync (automatic)' }

// Where the sync keeps its own records in Firestore
export const STATUS_DOC = 'sync/afriff' // small; the console's "afriff.com sync" card reads it
export const BASELINE_DOC = 'sync/afriff-baseline' // what afriff.com said last time (function only)
export const RUNS_COLLECTION = 'syncRuns' // one record per run that changed something, with before/after values
