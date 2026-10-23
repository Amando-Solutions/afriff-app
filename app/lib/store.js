import { effectScope, reactive, watch } from 'vue';
import { lagosDate } from './now.js';
import { getSharing, queueUsageReport, setSharing as saveSharing } from './usage.js';

// "My Festival": picks (screenings and events), "Seen it" films with date and
// star rating, and which live queues you've looked at.
// SAVED ON THIS PHONE (browser storage), so it survives closing the app.
// No account: if someone clears their browser data, it starts empty again.
const KEY = 'afriff-my-v1';

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

const saved = typeof window === 'undefined' ? null : loadSaved();

// One shared state for every screen (reactive, so taps show everywhere at once)
const state = reactive({
  scheduled: saved?.scheduled || new Set(),
  // filmId -> { date: 'YYYY-MM-DD', rating: 0-5 } (0 = no rating)
  watched: saved?.watched || new Map(),
  queuesChecked: saved?.queuesChecked || new Set(),
  sharing: typeof window === 'undefined' ? true : getSharing(),
});

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // effectScope(true): these watchers belong to the app, not to whichever
  // screen happened to call useFestival() first, so they keep running
  // when you move between screens.
  effectScope(true).run(() => {
  // save on the phone whenever something changes
  watch(
    () => [state.scheduled.size, [...state.scheduled].join(), [...state.watched].map(([k, v]) => `${k}:${v.rating}`).join(), state.queuesChecked.size],
    () => {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          scheduled: [...state.scheduled], watched: [...state.watched], queuesChecked: [...state.queuesChecked],
        }));
      } catch {
        /* storage full or blocked: keeps working for this visit */
      }
    },
  );
  // anonymous counts for AFRIFF's reports (only if sharing is on; sent in batches)
  watch(
    () => [state.sharing, [...state.scheduled].join(), [...state.watched].map(([k, v]) => `${k}:${v.rating}`).join()],
    () => { if (state.sharing) queueUsageReport({ scheduled: state.scheduled, watched: state.watched }); },
    { immediate: true },
  );
  });
}

export function useFestival() {
  start();
  return {
    state,
    isScheduled: (id) => state.scheduled.has(id),
    isWatched: (filmId) => state.watched.has(filmId),
    toggleScheduled: (id) => {
      if (state.scheduled.has(id)) state.scheduled.delete(id);
      else state.scheduled.add(id);
    },
    toggleWatched: (filmId) => {
      if (state.watched.has(filmId)) state.watched.delete(filmId);
      else state.watched.set(filmId, { date: lagosDate(), rating: 0 });
    },
    rateWatched: (filmId, rating) => {
      const w = state.watched.get(filmId);
      if (w) state.watched.set(filmId, { ...w, rating });
    },
    markQueuesChecked: (ids) => {
      ids.forEach((id) => { if (!state.queuesChecked.has(id)) state.queuesChecked.add(id); });
    },
    setSharing: (on) => {
      saveSharing(on);
      state.sharing = on;
    },
  };
}
