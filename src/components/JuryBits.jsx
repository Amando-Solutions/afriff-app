import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { JURY } from '../data/jury.js';
import { initials } from '../lib/format.js';
import BottomSheet from './BottomSheet.jsx';

// Round photo, or initials if there's no photo (or it fails to load)
export function JuryAvatar({ member, size = 56 }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.32) };
  if (member.photo && !broken) {
    return <img className="jury-avatar" style={style} src={member.photo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />;
  }
  return <span className="jury-avatar initials" style={style} aria-hidden="true">{initials(member.name.replace(/^Dr\.?\s+/, ''))}</span>;
}

// Rectangular portrait for the Jury page grid: the whole photo is shown
// (never cropped) inside a 4:5 frame; initials if there's no photo.
export function JuryPhoto({ member }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="jury-photo">
      {member.photo && !broken
        ? <img src={member.photo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
        : <span className="jury-photo-initials" aria-hidden="true">{initials(member.name.replace(/^Dr\.?\s+/, ''))}</span>}
    </span>
  );
}

// Bio that slides up when someone is tapped
export function JurySheet({ member, onClose }) {
  return (
    <BottomSheet title={member.jury} onClose={onClose}>
      <div className="jury-sheet">
        <JuryAvatar member={member} size={96} />
        <h3 className="jury-sheet-name">{member.name}</h3>
        <p className="muted small">{[member.roles, member.country].filter(Boolean).join(' · ')}</p>
        {member.bio && <p className="jury-sheet-bio">{member.bio}</p>}
      </div>
    </BottomSheet>
  );
}

// "Meet the jury" row of faces (Home and the Globe Awards page).
// Tapping a face opens their bio; "See all" opens the Jury page.
export function JuryRow({ title = 'Meet the jury', intro }) {
  const [open, setOpen] = useState(null);
  if (JURY.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <a href="#/jury" className="link">See all <ChevronRight size={18} /></a>
      </div>
      {intro && <p className="muted small jury-intro">{intro}</p>}
      <div className="jury-row">
        {JURY.map((m) => (
          <button key={m.id} type="button" className="jury-face" onClick={() => setOpen(m)}>
            <JuryAvatar member={m} size={60} />
            <span className="jury-face-name">{m.name.replace(/^Dr\.?\s+/, '').split(' ')[0]}</span>
            <span className="jury-face-country">{m.country.split(' / ')[0]}</span>
          </button>
        ))}
      </div>
      {open && <JurySheet member={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
