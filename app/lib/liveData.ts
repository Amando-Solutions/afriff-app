// Getting the festival data an admin PUBLISHED from the console onto phones.
//
// 1. On start, the app uses the copy saved on this phone last time (or the
//    built-in afriff.com copy on a first visit), so it opens instantly, even
//    with no signal.
// 2. Once the first screen is up, it connects to Firestore directly (no server
//    route) and watches a tiny marker, published/version, live.
// 3. When the marker says there's a newer version than this phone has, it
//    downloads the bundle (published/current), swaps it in, saves it on the
//    phone, and the screens update. Publishing reaches open phones within
//    seconds; a phone that was offline catches up as soon as it reconnects.
//    Reconnecting is the Firebase SDK's job (see lib/firebase/app.ts).
import { ref } from 'vue';
import { VENUES, replaceProgramme } from '../data/programme';
import { replaceEvents } from '../data/events';
import { replaceJury } from '../data/jury';
import type { PublishedSnapshot } from '~/types/festival';

const CACHE_KEY = 'afriff-data-v1';

let version = 0; // 0 = built-in copy
export const currentVersion = () => version;

// Screens are keyed on this, so they redraw when newer data arrives.
export const dataVersion = ref(0);

function apply(snapshot: PublishedSnapshot) {
  replaceProgramme(snapshot);
  if (snapshot.events) replaceEvents(snapshot.events, new Set(VENUES.map((v) => v.id)));
  if (snapshot.jury?.length) replaceJury(snapshot.jury);
  version = snapshot.version || 0;
  dataVersion.value = version;
}

// Step 1: use what this phone saved last time (called before the first render).
export function loadSavedCopy() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const snapshot = JSON.parse(raw) as PublishedSnapshot | null;
    if (!snapshot?.version) return false;
    apply(snapshot);
    return true;
  } catch {
    return false; // storage blocked or damaged: carry on with the built-in copy
  }
}

function adopt(snapshot: PublishedSnapshot | null) {
  if (!snapshot?.version || snapshot.version <= version) return false;
  apply(snapshot);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    /* phone storage full or blocked: still use it for this visit */
  }
  return true;
}

// One download at a time; a publish that lands mid-download is fetched after it.
let pulling = false;
let again = false;
async function pull() {
  if (pulling) {
    again = true;
    return;
  }
  pulling = true;
  try {
    const live = await import('./firebase/live');
    do {
      again = false;
      try {
        adopt(await live.readPublished());
      } catch {
        /* offline and not in the cache yet, or nothing published: keep what we have */
      }
    } while (again);
  } finally {
    pulling = false;
  }
}

// Steps 2–3. Called once, after the first screen is showing.
let started = false;
export async function startPublishedFeed() {
  if (started) return;
  started = true;
  let live: typeof import('./firebase/live');
  try {
    live = await import('./firebase/live');
  } catch {
    started = false; // the code couldn't load (offline on a first visit): try again on the next start
    return;
  }
  let checkedWithoutMarker = false;
  live.watchPublishedVersion(
    ({ version: v, fromCache }) => {
      if (v === null) {
        // No marker: published before the marker existed (or never). Read the
        // bundle once, from the server, and rely on the next publish's marker.
        if (!fromCache && !checkedWithoutMarker) {
          checkedWithoutMarker = true;
          void pull();
        }
        return;
      }
      if (v > version) void pull();
    },
    (e) => console.warn('[liveData] published feed stopped', e),
  );
}
