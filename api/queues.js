// Vercel relay: GET /api/queues?date=YYYY-MM-DD
// Returns the live queue counts door volunteers posted for one festival day
// (default: today in Lagos). There is one small database record per venue
// per day, so each refresh reads about 3 records. Vercel keeps the answer
// for 30 seconds and serves that copy to everyone, so the database is read a
// few times a minute however many phones are watching.

const BASE = 'https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents';

const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());

// Firestore's REST answers wrap every value in its type; unwrap the ones we use
function plain(v) {
  if (!v) return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, plain(x)]));
  return null;
}

export function boardsToQueues(documents = []) {
  const queues = {};
  for (const d of documents) {
    const venue = d.name.split('/').pop();
    const s = plain({ mapValue: { fields: d.fields?.s?.mapValue?.fields || {} } }) || {};
    for (const [id, e] of Object.entries(s)) {
      if (!e) continue;
      queues[id] = {
        venue,
        inLine: Math.max(0, Number(e.inLine) || 0),
        seatsLeft: Math.max(0, Number(e.seatsLeft) || 0),
        updatedAt: e.updatedAt || null,
      };
    }
  }
  return queues;
}

export default async function handler(req, res) {
  const asked = String(req.query?.date || '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : lagosToday();
  try {
    const r = await fetch(`${BASE}/queueDays/${date}/venues?pageSize=50`);
    if (!r.ok && r.status !== 404) throw new Error(`Database answered ${r.status}`);
    const body = r.ok ? await r.json() : {};
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=5');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ date, fetchedAt: Date.now(), queues: boardsToQueues(body.documents) });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: e.message });
  }
}
