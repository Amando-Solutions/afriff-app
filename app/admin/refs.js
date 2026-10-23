// Screenings show film titles and venue names; news can link to a screening or event.
import { computed } from 'vue';
import { useCollection } from './data.js';

export function useRefs(colName) {
  const films = useCollection('films');
  const venues = useCollection('venues');
  const screenings = useCollection(() => (colName === 'news' ? 'screenings' : null));
  const events = useCollection(() => (colName === 'news' ? 'events' : null));
  return computed(() => ({ films: films.map.value, venues: venues.map.value, screenings: screenings.map.value, events: events.map.value }));
}
