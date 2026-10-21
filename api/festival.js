// Vercel relay: GET /api/festival
// Returns the festival data an admin last published from the console.
// Vercel keeps the answer for 60 seconds and serves that copy to everyone,
// so the database is read about once a minute no matter how many phones ask.
// (Firebase's free plan allows 50,000 reads a day.)

const PUBLISHED_DOC =
  'https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents/published/current';

export default async function handler(req, res) {
  try {
    const r = await fetch(PUBLISHED_DOC);
    if (r.status === 404) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.status(404).json({ error: 'Nothing has been published yet' });
      return;
    }
    if (!r.ok) throw new Error(`Database answered ${r.status}`);
    const doc = await r.json();
    const json = doc?.fields?.json?.stringValue;
    if (!json) throw new Error('Published document has no data');
    // fresh for 60 s. Only a short "serve old while refreshing" window: a long
    // one meant that when few people use the app, the first phone after a
    // publish got the old copy and kept it for 5 minutes. (Phones keep their
    // own saved copy if the relay is ever down, so no long window is needed.)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=10');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(json);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: e.message });
  }
}
