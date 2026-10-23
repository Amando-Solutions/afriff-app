// Remembers your day, venues, filters and view on the Programme while you
// open films and come back (for this visit; a reload starts fresh).
import { reactive } from 'vue';
import { FESTIVAL } from '../data/programme.js';
import { lagosDate } from './now.js';

const today = lagosDate();
export const programmeMemory = reactive({
  day: FESTIVAL.days.includes(today) ? today : FESTIVAL.days[0],
  venues: [],
  tag: 'All',
  view: 'list',
  eventFilter: 'all',
  type: 'all',
});

// Open the Schedule on a given day (used by Home's "See today")
export function openProgrammeDay(day) {
  programmeMemory.day = day;
  programmeMemory.type = 'all';
  programmeMemory.venues = [];
}
