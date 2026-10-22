import { useEffect } from 'react';
import { Users } from 'lucide-react';
import { useFestival } from '../lib/store.jsx';
import { VENUES, filmById, venueById } from '../data/programme.js';
import { queueLabel, timeLabel } from '../lib/format.js';
import { isSampleQueues, minutesAgo, openQueues, recentUpdates, useLiveClock } from '../lib/queues.js';
import { PageTitle, VenueDot, VenueLine } from '../components/Bits.jsx';

function LiveTag() {
  return (
    <span className="live-tag"><span className="pulse" aria-hidden="true" /> LIVE</span>
  );
}

// One pin per venue, coloured by the soonest open queue there (item 28, map-lite).
function VenuePins({ open }) {
  return (
    <div className="venue-pins">
      <div className="venue-pins-row">
        {VENUES.map((v) => {
          const here = open.filter((x) => x.screening.venue === v.id);
          const label = here.length ? queueLabel(here[0].queue) : null;
          return (
            <div key={v.id} className={`venue-pin${label ? ` tone-bg-${label.tone}` : ''}`}>
              <span className="venue-pin-name"><VenueDot venueId={v.id} /> {v.name.replace('Filmhouse ', '')}</span>
              <span className="venue-pin-state">{label ? `${label.text} · ${here.length} line${here.length > 1 ? 's' : ''}` : 'No lines'}</span>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="tone-bg-good" /> Good chance</span>
        <span><i className="tone-bg-gold" /> Tight</span>
        <span><i className="tone-bg-alert" /> Unlikely / Full</span>
      </div>
    </div>
  );
}

export default function Queues() {
  const t = useLiveClock();
  const open = openQueues(t);
  const updates = recentUpdates(t);

  const { markQueuesChecked } = useFestival();
  const shownIds = open.map((x) => x.screening.id).join(',');
  useEffect(() => {
    if (shownIds) markQueuesChecked(shownIds.split(','));
  }, [shownIds, markQueuesChecked]);

  return (
    <div className="page">
      <PageTitle icon={Users}>Queues</PageTitle>
      <p className="muted">See how long each line is before you head over. Counts are posted by AFRIFF door volunteers.</p>

      <section className="section">
        <LiveTag />
        <h2 className="live-title">Queues open now</h2>
        <p className="muted small">Screenings where door volunteers are counting the line</p>

        {open.length === 0 ? (
          <p className="empty">No queues being counted right now. Volunteers start counting when each queue opens.</p>
        ) : (
          <>
            <VenuePins open={open} />
            <div className="stack" style={{ marginTop: 14 }}>
              {open.map(({ screening: s, queue }) => {
                const film = filmById(s.film);
                const label = queueLabel(queue);
                return (
                  <a key={s.id} href={`#/film/${film.id}`} className="queue-row">
                    <div className="queue-row-top">
                      <span className="row-title">{film.title}</span>
                      <span className={`label tone-${label.tone}`}>{label.text}</span>
                    </div>
                    <span className="muted small">{timeLabel(s.time)} · <VenueLine venueId={s.venue} screen={s.screen} />{s.tag === 'Industry' ? ' · Industry' : ''}</span>
                    <div className="queue-stats">
                      <span><strong>{queue.inLine}</strong> in line</span>
                      <span><strong>{queue.seatsLeft}</strong> seats left</span>
                      <span className="queue-updated">{minutesAgo(t, queue.updatedAt)}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="section">
        <LiveTag />
        <h2 className="live-title">Recent updates</h2>
        <p className="muted small">Latest counts first</p>
        {updates.length === 0 ? (
          <p className="empty">No counts posted yet.</p>
        ) : (
          <div className="updates">
            {updates.map(({ screening: s, queue }) => {
              const label = queueLabel(queue);
              return (
                <div key={`${s.id}-${queue.updatedAt}`} className="update-row">
                  <span className="update-when">{minutesAgo(t, queue.updatedAt)}</span>
                  <span className="update-body">
                    <span className="update-title">{filmById(s.film).title}</span>
                    <span className="muted small">{venueById(s.venue).name} · {queue.inLine} in line · {queue.seatsLeft} seats left</span>
                  </span>
                  <span className={`update-label tone-${label.tone}`}>{label.text}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="footnote">{isSampleQueues() ? 'Sample counts for testing.' : 'Counts update about every minute.'} Times are samples until the festival schedule is published.</p>
    </div>
  );
}
