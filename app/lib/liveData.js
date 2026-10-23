// Getting the festival data an admin PUBLISHED from the console onto phones.
//
// 1. On start, the app uses the copy saved on this phone last time (or the
//    built-in afriff.com copy on a first visit), so it opens instantly, even
//    with no signal.
// 2. It then asks for the latest published version: from our small relay at
//    /api/festival (a Nuxt server route that keeps a 1-minute copy, so the
//    database is read about once a minute however many people use the app),
//    falling back to the database directly.
// 3. If that's newer, it swaps it in, saves it on the phone, and the screens
//    update. It checks again every 5 minutes and whenever the app is reopened.
import { ref } from 'vue';
import { VENUES, replaceProgramme } from '../data/programme.js';
import { replaceEvents } from '../data/events.js';
import { replaceJury } from '../data/jury.js';

const CACHE_KEY = 'afriff-data-v1';
const FIRESTORE_DOC =
  'https://firestore.googleapis.com/v1/projects/afriff-app/databases/(default)/documents/published/current' +
  '?key=AIzaSyCPxdNaQyK6r4OU97-zBZBKLqHsHunGzYo';

let version = 0; // 0 = built-in copy
export const currentVersion = () => version;

// Screens are keyed on this, so they redraw when newer data arrives.
export const dataVersion = ref(0);

function apply(snapshot) {
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
    const snapshot = JSON.parse(raw);
    if (!snapshot?.version) return false;
    apply(snapshot);
    return true;
  } catch {
    return false; // storage blocked or damaged: carry on with the built-in copy
  }
}

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPublished() {
  try {
    return await getJson('/api/festival');
  } catch {
    /* relay unreachable: fall back to the database directly */
  }
  const doc = await getJson(FIRESTORE_DOC);
  const json = doc?.fields?.json?.stringValue;
  if (!json) throw new Error('Nothing published yet');
  return JSON.parse(json);
}

// Steps 2–3: returns true if newer data arrived and was swapped in.
export async function checkForUpdates() {
  try {
    const snapshot = await fetchPublished();
    if (!snapshot?.version || snapshot.version <= version) return false;
    apply(snapshot);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      /* phone storage full or blocked: still use it for this visit */
    }
    return true;
  } catch {
    return false; // offline or nothing published yet: keep what we have
  }
}
