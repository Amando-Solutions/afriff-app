import { ArrowUpRight, Navigation } from 'lucide-react';
import { HOW_TO_ATTEND, SCREENINGS, VENUES } from '../data/programme.js';
import BottomSheet from './BottomSheet.jsx';

export const directionsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

// "How to attend" bottom sheet (opened from Home and Venues).
export default function HowToAttend({ onClose }) {
  return (
    <BottomSheet title="How to attend" onClose={onClose}>
      {HOW_TO_ATTEND.map((s) => (
        <section key={s.id} className="hta-section">
          <h3 className="hta-head">{s.title}</h3>
          <p className="hta-body">{s.body}</p>
          {s.link && (
            <a className="link hta-link" href={s.link.url} target="_blank" rel="noopener noreferrer">
              {s.link.label} <ArrowUpRight size={16} />
            </a>
          )}
        </section>
      ))}

      <h3 className="hta-head hta-venues-head">Venues</h3>
      {VENUES.map((v) => {
        const n = SCREENINGS.filter((s) => s.venue === v.id).length;
        return (
          <div key={v.id} className="hta-venue">
            <div className="hta-venue-text">
              <span className="hta-venue-name"><span className="dot" style={{ background: v.color, width: 10, height: 10 }} /> {v.name}</span>
              <span className="muted small">{v.address}</span>
              <span className="hta-venue-count">{n} screening{n === 1 ? '' : 's'}</span>
            </div>
            <a className="round-btn" href={directionsUrl(v.address)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${v.name}`}>
              <Navigation size={18} />
            </a>
          </div>
        );
      })}
    </BottomSheet>
  );
}
