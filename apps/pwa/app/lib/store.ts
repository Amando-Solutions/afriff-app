import { effectScope, reactive, watch } from 'vue';
import { lagosDate } from '@afriff/core/utils/now';
import type { PlanData } from '@afriff/core/accounts/plans';
import { getSharing, queueUsageReport, setSharing as saveSharing } from './usage';

// "My Festival": picks (screenings and events), "Seen it" films with date and
// star rating, and which live queues you've looked at.
// SAVED ON THIS PHONE (browser storage), so it survives closing the app and
// works with no signal. For people who are signed in, a copy is also kept in
// their account (lib/planSync.ts), so it follows them to another phone.
const KEY = 'afriff-my-v1';

export interface Watched {
  /** 'YYYY-MM-DD' the film was marked seen */
  date: string;
  /** 0 = no rating, else 1–5 stars */
  rating: number;
}

interface Saved {
  scheduled: Set<string>;
  watched: Map<string, Watched>;
  queuesChecked: Set<string>;
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      scheduled: new Set<string>(Array.isArray(d.scheduled) ? d.scheduled : []),
      watched: new Map<string, Watched>(Array.isArray(d.watched) ? d.watched : []),
      queuesChecked: new Set<string>(Array.isArray(d.queuesChecked) ? d.queuesChecked : []),
    };
  } catch {
    return null; // blocked or damaged storage: start empty
  }
}

const saved = typeof window === 'undefined' ? null : loadSaved();

// One shared state for every screen (reactive, so taps show everywhere at once)
const state = reactive({
  scheduled: saved?.scheduled || new Set<string>(),
  watched: saved?.watched || new Map<string, Watched>(),
  queuesChecked: saved?.queuesChecked || new Set<string>(),
  sharing: typeof window === 'undefined' ? true : getSharing(),
});

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      scheduled: [...state.scheduled], watched: [...state.watched], queuesChecked: [...state.queuesChecked],
    }));
  } catch {
    /* storage full or blocked: keeps working for this visit */
  }
}

/** My Festival as it's saved in an account (lib/planSync.ts). */
export function currentPlan(): PlanData {
  return {
    scheduled: [...state.scheduled],
    watched: Object.fromEntries(state.watched),
    queuesChecked: [...state.queuesChecked],
  };
}

/** Replace what this phone holds with the account's copy (or empty it, on log out). */
export function replacePlan(p: PlanData) {
  state.scheduled = new Set(p.scheduled);
  state.watched = new Map(Object.entries(p.watched));
  state.queuesChecked = new Set(p.queuesChecked);
  persist();
}

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // effectScope(true): these watchers belong to the app, not to whichever
  // screen happened to call useFestival() first, so they keep running
  // when you move between screens.
  effectScope(true).run(() => {
    const ratings = () => [...state.watched].map(([k, v]) => `${k}:${v.rating}`).join();
    // save on the phone whenever something changes
    watch(() => [[...state.scheduled].join(), ratings(), state.queuesChecked.size], persist);
    // anonymous counts for AFRIFF's reports (only if sharing is on; sent in batches)
    watch(
      () => [state.sharing, [...state.scheduled].join(), ratings()],
      () => { if (state.sharing) queueUsageReport({ scheduled: state.scheduled, watched: state.watched }); },
      { immediate: true },
    );
  });
}

export function useFestival() {
  start();
  return {
    state,
    isScheduled: (id: string) => state.scheduled.has(id),
    isWatched: (filmId: string) => state.watched.has(filmId),
    toggleScheduled: (id: string) => {
      if (state.scheduled.has(id)) state.scheduled.delete(id);
      else state.scheduled.add(id);
    },
    toggleWatched: (filmId: string) => {
      if (state.watched.has(filmId)) state.watched.delete(filmId);
      else state.watched.set(filmId, { date: lagosDate(), rating: 0 });
    },
    rateWatched: (filmId: string, rating: number) => {
      const w = state.watched.get(filmId);
      if (w) state.watched.set(filmId, { ...w, rating });
    },
    markQueuesChecked: (ids: string[]) => {
      ids.forEach((id) => { if (!state.queuesChecked.has(id)) state.queuesChecked.add(id); });
    },
    setSharing: (on: boolean) => {
      saveSharing(on);
      state.sharing = on;
    },
  };
}
