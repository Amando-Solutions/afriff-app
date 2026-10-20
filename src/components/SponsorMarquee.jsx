import { useState } from 'react';
import { SPONSORS } from '../data/programme.js';

// Sponsor logos gliding left to right on a loop.
// variant 'ribbon' = slim strip above the header on every screen,
// variant 'strip'  = larger strip at the bottom of Home.
// The list is repeated twice so the loop is seamless. Holding a finger on it
// pauses it; phones set to "reduce motion" get a still row you can swipe.

function Logo({ sponsor, decorative }) {
  const [broken, setBroken] = useState(false);
  const style = sponsor.logoStyle || 'white';
  const body = sponsor.logo && !broken
    ? <img src={sponsor.logo} alt={decorative ? '' : sponsor.name} className={`logo-${style}`} decoding="async" onError={() => setBroken(true)} />
    : <span className="marquee-name">{sponsor.name}</span>;
  const props = { className: 'marquee-item', 'aria-hidden': decorative || undefined };
  return sponsor.website
    ? <a {...props} href={sponsor.website} target="_blank" rel="noopener noreferrer" tabIndex={decorative ? -1 : undefined}>{body}</a>
    : <span {...props}>{body}</span>;
}

export default function SponsorMarquee({ variant = 'strip' }) {
  const list = [...SPONSORS].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  if (list.length === 0) return null;
  // ~4–5 seconds per logo keeps it calm and readable
  const seconds = list.length * (variant === 'ribbon' ? 4 : 5);
  return (
    <div className={`marquee marquee-${variant}`} role="region" aria-label="Festival sponsors">
      <div className="marquee-track" style={{ '--marquee-duration': `${seconds}s` }}>
        {list.map((s) => <Logo key={s.name} sponsor={s} />)}
        {list.map((s) => <Logo key={`${s.name}-copy`} sponsor={s} decorative />)}
      </div>
    </div>
  );
}
