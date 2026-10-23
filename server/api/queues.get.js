// Relay: GET /api/queues?date=YYYY-MM-DD
// Returns the live queue counts door volunteers posted for one festival day
// (default: today in Lagos). There is one small database record per venue
// per day, so each refresh reads about 3 records. The CDN keeps the answer
// for 30 seconds and serves that copy to everyone, so the database is read a
// few times a minute however many phones are watching.
import { boardsToQueues } from '../utils/queueBoards.js';

const BASE = 'https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents';

const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());

export default defineEventHandler(async (event) => {
  const asked = String(getQuery(event).date || '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : lagosToday();
  try {
    const r = await fetch(`${BASE}/queueDays/${date}/venues?pageSize=50`);
    if (!r.ok && r.status !== 404) throw new Error(`Database answered ${r.status}`);
    const body = r.ok ? await r.json() : {};
    setResponseHeader(event, 'Cache-Control', 'public, s-maxage=30, stale-while-revalidate=5');
    return { date, fetchedAt: Date.now(), queues: boardsToQueues(body.documents) };
  } catch (e) {
    setResponseHeader(event, 'Cache-Control', 'no-store');
    setResponseStatus(event, 502);
    return { error: e.message };
  }
});
