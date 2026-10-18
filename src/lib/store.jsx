import { createContext, useCallback, useContext, useState } from 'react';
import { SAMPLE_MY_SCHEDULE, SAMPLE_WATCHED } from '../data/programme.js';
import { lagosDate } from './now.js';

// Remembers "My Festival" picks, "Seen it" films (with date and star rating)
// and which live queues you've looked at, while the app is open.
// Step 1: forgotten on refresh. Step 4 saves them on the phone.
const FestivalContext = createContext(null);

function toggleIn(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function FestivalProvider({ children }) {
  const [scheduled, setScheduled] = useState(() => new Set(SAMPLE_MY_SCHEDULE));
  // filmId -> { date: 'YYYY-MM-DD', rating: 0-5 } (0 = no rating)
  const [watched, setWatched] = useState(() => new Map(SAMPLE_WATCHED.map((id) => [id, { date: lagosDate(), rating: 0 }])));
  const [queuesChecked, setQueuesChecked] = useState(() => new Set());

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
    isScheduled: (screeningId) => scheduled.has(screeningId),
    isWatched: (filmId) => watched.has(filmId),
    toggleScheduled: (screeningId) => setScheduled((s) => toggleIn(s, screeningId)),
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
