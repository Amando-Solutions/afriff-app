import { Check, Plus } from 'lucide-react';
import { venueById } from '../data/programme.js';
import { queueLabel } from '../lib/format.js';
import { statusTag } from '../lib/alerts.js';

// Small building blocks reused across screens.

export function Poster({ film, className = '', children }) {
  const { style, a, b } = film.poster;
  let background;
  if (style === 'stripes') {
    background = `repeating-linear-gradient(120deg, ${a} 0 14%, ${b} 14% 28%, #1a0d0d 28% 36%)`;
  } else if (style === 'split') {
    background = `linear-gradient(160deg, ${a} 0 45%, ${b} 45% 100%)`;
  } else {
    background = `radial-gradient(circle at 30% 30%, ${a} 0%, transparent 55%), radial-gradient(circle at 70% 75%, ${b} 0%, transparent 70%), #160b2a`;
  }
  return (
    <div className={`poster ${className}${film.image ? ' has-image' : ''}`} style={{ background }} role="img" aria-label={`${film.title} poster`}>
      {film.image && (
        // loads only when scrolled into view; if it fails, the colour placeholder shows
        <img src={film.image} alt="" loading="lazy" decoding="async" onError={(e) => e.currentTarget.remove()} />
      )}
      {children}
    </div>
  );
}

export function VenueDot({ venueId, size = 8 }) {
  const v = venueById(venueId);
  return <span className="dot" style={{ background: v?.color, width: size, height: size }} aria-hidden="true" />;
}

export function VenueLine({ venueId, screen }) {
  const v = venueById(venueId);
  return (
    <span className="venue-line">
      <VenueDot venueId={venueId} />
      {v.name}{screen ? ` · ${screen}` : ''}
    </span>
  );
}

export function QueueTag({ queue }) {
  const label = queueLabel(queue);
  if (!label) return null;
  return (
    <span className={`queue-tag tone-${label.tone}`}>
      <span className="pulse" aria-hidden="true" />
      {queue.inLine} in line · {label.text}
    </span>
  );
}

export function AddButton({ added, onClick, title }) {
  return (
    <button
      type="button"
      className={`round-btn${added ? ' added' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      aria-pressed={added}
      aria-label={added ? `Remove ${title} from My Festival` : `Add ${title} to My Festival`}
    >
      {added ? <Check size={20} strokeWidth={2.4} /> : <Plus size={20} strokeWidth={2} />}
    </button>
  );
}

export function PageTitle({ icon: Icon, children }) {
  return (
    <h1 className="page-title">
      {children}
      {Icon && <Icon size={30} strokeWidth={1.8} className="page-title-icon" />}
    </h1>
  );
}

// "Cancelled" / "Moved" / "Time changed", set on a screening or event in the console
export function StatusTag({ status }) {
  const t = statusTag(status);
  if (!t) return null;
  return <span className={`status-tag tone-${t.tone}`}>{t.text}</span>;
}
