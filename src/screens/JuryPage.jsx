import { useState } from 'react';
import { ArrowUpRight, Award, ChevronRight } from 'lucide-react';
import { JURY_LINKS, juryGroups } from '../data/jury.js';
import { PageTitle } from '../components/Bits.jsx';
import { JuryAvatar, JurySheet } from '../components/JuryBits.jsx';

// THE JURY: one heading per jury (e.g. International Jury), a card per
// member; tapping a card slides up their bio.
export default function JuryPage() {
  const [open, setOpen] = useState(null);
  const groups = juryGroups();
  const total = groups.reduce((n, g) => n + g.members.length, 0);

  return (
    <div className="page">
      <PageTitle icon={Award}>The Jury</PageTitle>
      <p className="muted">AFRIFF 15 · {total} jury member{total === 1 ? '' : 's'} choosing this year's Globe Award winners</p>

      {groups.map((g) => (
        <section key={g.name} className="jury-group">
          <h2 className="jury-group-head">{g.name} <span className="af-count">{g.members.length}</span></h2>
          <div className="stack">
            {g.members.map((m) => (
              <button key={m.id} type="button" className="jury-card" onClick={() => setOpen(m)}>
                <JuryAvatar member={m} size={56} />
                <span className="jury-card-text">
                  <span className="jury-card-name">{m.name}</span>
                  <span className="muted small">{m.roles}</span>
                  <span className="jury-card-country">{m.country}</span>
                </span>
                <ChevronRight size={18} className="jury-card-chevron" />
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="jury-links">
        <a className="link" href={JURY_LINKS.pressRelease} target="_blank" rel="noopener noreferrer">Read the jury announcement <ArrowUpRight size={16} /></a>
        <a className="link" href={JURY_LINKS.pastJuries} target="_blank" rel="noopener noreferrer">See past juries on afriff.com <ArrowUpRight size={16} /></a>
      </div>

      {open && <JurySheet member={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
