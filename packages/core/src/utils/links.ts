// Links typed in the console end up as buttons and images on attendees'
// phones (trailers, event buttons, "Read more", sponsor websites, posters).
// Only real web addresses get through: anything else (a "javascript:" link,
// a typo, a file on someone's laptop) is dropped. The console checks these
// as they're typed (apps/admin/app/lib/checks.ts); phones check again when
// the published data arrives (data/*.ts), so a bad link can't reach a tap.

function parse(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s || /\s/.test(s) || s.length > 2000) return null
  try {
    const url = new URL(s)
    return url.hostname.includes('.') ? url : null
  } catch {
    return null
  }
}

/** An http(s) web address, or '' */
export function webLink(raw: unknown): string {
  const url = parse(raw)
  return url && (url.protocol === 'https:' || url.protocol === 'http:') ? String(raw).trim() : ''
}

/** An image: an https address, or a file shipped with the app ("/masterclasses/acting-rmd.jpg"), or '' */
export function imageLink(raw: unknown): string {
  if (typeof raw === 'string' && /^\/[\w\-./%]+$/.test(raw.trim()) && !raw.includes('..') && !raw.startsWith('//')) return raw.trim()
  const url = parse(raw)
  return url?.protocol === 'https:' ? String(raw).trim() : ''
}

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com']

/** A YouTube or Vimeo address (the only trailers attendees can open), or '' */
export function videoLink(raw: unknown): string {
  const link = webLink(raw)
  if (!link) return ''
  const host = new URL(link).hostname.toLowerCase()
  return VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ? link : ''
}
