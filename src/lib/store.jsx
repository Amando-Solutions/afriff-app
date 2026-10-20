import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { lagosDate } from './now.js';
import { getSharing, queueUsageReport, setSharing as saveSharing } from './usage.js';

// "My Festival": picks (screenings and events), "Seen it" films with date and
// star rating, and which live queues you've looked at.
// SAVED ON THIS PHONE (browser storage), so it survives closing the app.
// No account: if someone clears their browser data, it starts empty again.
const KEY = 'afriff-my-v1';
const FestivalContext = createContext(null);

function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      scheduled: new Set(Array.isArray(d.scheduled) ? d.scheduled : []),
      watched: new Map(Array.isArray(d.watched) ? d.watched : []),
      queuesChecked: new Set(Array.isArray(d.queuesChecked) ? d.queuesChecked : []),
    };
  } catch {
    return null; // blocked or damaged storage: start empty
  }
}

function toggleIn(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function FestivalProvider({ children }) {
  const [saved] = useState(loadSaved);
  const [scheduled, setScheduled] = useState(() => saved?.scheduled || new Set());
  // filmId -> { date: 'YYYY-MM-DD', rating: 0-5 } (0 = no rating)
  const [watched, setWatched] = useState(() => saved?.watched || new Map());
  const [queuesChecked, setQueuesChecked] = useState(() => saved?.queuesChecked || new Set());
  const [sharing, setSharingState] = useState(getSharing);

  // save on the phone whenever something changes
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        scheduled: [...scheduled], watched: [...watched], queuesChecked: [...queuesChecked],
      }));
    } catch {
      /* storage full or blocked: keeps working for this visit */
    }
  }, [scheduled, watched, queuesChecked]);

  // anonymous counts for AFRIFF's reports (only if sharing is on; sent in batches)
  useEffect(() => {
    if (sharing) queueUsageReport({ scheduled, watched });
  }, [scheduled, watched, sharing]);

  const markQueuesChecked = useCallback((screeningIds) => {
    setQueuesChecked((s) => {
      if (screeningIds.every((id) => s.has(id))) return s;
      const next = new Set(s);
      screeningIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const value = {
    scheduled,
    watched,
    queuesChecked,
    sharing,
    setSharing: (on) => {
      saveSharing(on);
      setSharingState(on);
    },
    isScheduled: (id) => scheduled.has(id),
    isWatched: (filmId) => watched.has(filmId),
    toggleScheduled: (id) => setScheduled((s) => toggleIn(s, id)),
    toggleWatched: (filmId) =>
      setWatched((m) => {
        const next = new Map(m);
        if (next.has(filmId)) next.delete(filmId);
        else next.set(filmId, { date: lagosDate(), rating: 0 });
        return next;
      }),
    rateWatched: (filmId, rating) =>
      setWatched((m) => {
        if (!m.has(filmId)) return m;
        const next = new Map(m);
        next.set(filmId, { ...m.get(filmId), rating });
        return next;
      }),
    markQueuesChecked,
  };
  return <FestivalContext.Provider value={value}>{children}</FestivalContext.Provider>;
}

export const useFestival = () => useContext(FestivalContext);
