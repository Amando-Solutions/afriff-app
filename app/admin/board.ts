// Door counter storage: ONE record per venue per day,
// queueDays/{date}/venues/{venue}, with a map `s` of screeningId →
// { inLine, seatsLeft, seatsStart, updatedAt, byName }. Phones read those few
// records through the /api/queues relay.
import { onBeforeUnmount, reactive, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { BoardDoc } from './types';

export const boardRef = (date: string, venue: string) => doc(db, 'queueDays', date, 'venues', venue);

// Live copy of one venue's record for one day. date/venue may be refs or getters.
export function useBoard(date: MaybeRefOrGetter<string | null | undefined>, venue: MaybeRefOrGetter<string | null | undefined>) {
  const b = reactive({ data: null as BoardDoc | null, pending: false, loaded: false, error: '' });
  let stop = () => {};
  watch(
    () => [toValue(date), toValue(venue)] as const,
    ([d, v]) => {
      stop();
      stop = () => {};
      Object.assign(b, { data: null, pending: false, loaded: false, error: '' });
      if (!d || !v) return;
      stop = onSnapshot(
        boardRef(d, v),
        { includeMetadataChanges: true }, // so we know when taps are still waiting to send
        (snap) => Object.assign(b, { data: snap.exists() ? (snap.data() as BoardDoc) : null, pending: snap.metadata.hasPendingWrites, loaded: true, error: '' }),
        (e) => Object.assign(b, { loaded: true, error: e.message }),
      );
    },
    { immediate: true },
  );
  onBeforeUnmount(() => stop());
  return b;
}
