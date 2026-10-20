import { useState } from 'react';
import { Info, MapPin, Navigation } from 'lucide-react';
import { SCREENINGS, VENUES } from '../data/programme.js';
import { PageTitle } from '../components/Bits.jsx';
import HowToAttend, { directionsUrl } from '../components/HowToAttend.jsx';

export default function Venues() {
  const [howOpen, setHowOpen] = useState(false);
  return (
    <div className="page">
      <PageTitle icon={MapPin}>Venues</PageTitle>
      <p className="muted">{VENUES.length} venue{VENUES.length === 1 ? "" : "s"} across Lagos</p>
      <button type="button" className="btn btn-outline btn-small" style={{ marginTop: 14 }} onClick={() => setHowOpen(true)}>
        <Info size={16} /> How to attend
      </button>
      <div className="stack" style={{ marginTop: 20 }}>
        {VENUES.map((v) => (
          <div key={v.id} className="venue-card">
            <div className="venue-card-head">
              <span className="dot" style={{ background: v.color, width: 12, height: 12 }} />
              <span className="row-title">{v.name}</span>
            </div>
            <p className="muted small">{v.address}</p>
            <p className="muted small">{SCREENINGS.filter((s) => s.venue === v.id).length} screenings this festival</p>
            <a className="btn btn-outline btn-small" href={directionsUrl(v.address)} target="_blank" rel="noopener noreferrer">
              <Navigation size={16} /> Directions
            </a>
          </div>
        ))}
      </div>
      {howOpen && <HowToAttend onClose={() => setHowOpen(false)} />}
    </div>
  );
}
