// Relay: GET /api/festival
// Returns the festival data an admin last published from the console.
// The host's CDN keeps the answer for 60 seconds and serves that copy to
// everyone, so the database is read about once a minute no matter how many
// phones ask. (Firebase's free plan allows 50,000 reads a day.)

const PUBLISHED_DOC =
  'https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents/published/current';

export default defineEventHandler(async (event) => {
  try {
    const r = await fetch(PUBLISHED_DOC);
    if (r.status === 404) {
      setResponseHeader(event, 'Cache-Control', 'public, s-maxage=60');
      setResponseStatus(event, 404);
      return { error: 'Nothing has been published yet' };
    }
    if (!r.ok) throw new Error(`Database answered ${r.status}`);
    const doc = (await r.json()) as { fields?: { json?: { stringValue?: string } } };
    const json = doc?.fields?.json?.stringValue;
    if (!json) throw new Error('Published document has no data');
    // fresh for 60 s. Only a short "serve old while refreshing" window: a long
    // one meant that when few people use the app, the first phone after a
    // publish got the old copy and kept it for 5 minutes. (Phones keep their
    // own saved copy if the relay is ever down, so no long window is needed.)
    setResponseHeader(event, 'Cache-Control', 'public, s-maxage=60, stale-while-revalidate=10');
    setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8');
    return json;
  } catch (e) {
    setResponseHeader(event, 'Cache-Control', 'no-store');
    setResponseStatus(event, 502);
    return { error: e instanceof Error ? e.message : String(e) };
  }
});
