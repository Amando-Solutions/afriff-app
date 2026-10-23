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

// One record per venue per day → { screeningId: { venue, inLine, seatsLeft, updatedAt } }
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
