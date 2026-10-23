// Remembers your day, venues, filters and view on the Programme while you
// open films and come back (for this visit; a reload starts fresh).
import { reactive } from 'vue';
import type { EventGroup } from '~/types/festival';
import { FESTIVAL } from '../data/programme';
import { lagosDate } from './now';
import type { DayItemType } from './dayItems';

const today = lagosDate();
export const programmeMemory = reactive({
  day: FESTIVAL.days.includes(today) ? today : FESTIVAL.days[0]!,
  venues: [] as string[],
  tag: 'All' as 'All' | 'Public' | 'Industry',
  view: 'list' as 'list' | 'timeline',
  eventFilter: 'all' as EventGroup | 'all',
  type: 'all' as DayItemType,
});

// Open the Schedule on a given day (used by Home's "See today")
export function openProgrammeDay(day: string) {
  programmeMemory.day = day;
  programmeMemory.type = 'all';
  programmeMemory.venues = [];
}
