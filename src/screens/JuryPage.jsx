import { useState } from 'react';
import { ArrowUpRight, Award, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { JURY_LINKS, juryGroups } from '../data/jury.js';
import { PageTitle } from '../components/Bits.jsx';
import { JuryAvatar, JuryPhoto, JurySheet } from '../components/JuryBits.jsx';

// THE JURY: one heading per jury (e.g. International Jury), a card per
// member; tapping a card slides up their bio. Grid view by default, with a
// toggle for list view (the phone remembers the choice).
const VIEW_KEY = 'afriff-jury-view';

function savedView() {
  try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
}

export default function JuryPage() {
  const [open, setOpen] = useState(null);
  const [view, setViewState] = useState(savedView);
  const groups = juryGroups();
  const total = groups.reduce((n, g) => n + g.members.length, 0);

  const setView = (v) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* not saved, fine */ }
  };

  return (
    <div className="page">
      <PageTitle icon={Award}>The Jury</PageTitle>
      <div className="jury-tools">
        <p className="muted">AFRIFF 15 · {total} jury member{total === 1 ? '' : 's'} choosing this year's Globe Award winners</p>
        <div className="toggle" role="group" aria-label="View">
          <button type="button" className={view === 'grid' ? 'on' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={18} /></button>
          <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="List view"><List size={20} /></button>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.name} className="jury-group">
          <h2 className="jury-group-head">{g.name} <span className="af-count">{g.members.length}</span></h2>
          {view === 'grid' ? (
            <div className="jury-grid">
              {g.members.map((m) => (
                <button key={m.id} type="button" className="jury-tile" onClick={() => setOpen(m)}>
                  <JuryPhoto member={m} />
                  <span className="jury-card-name">{m.name}</span>
                  <span className="muted small jury-tile-roles">{m.roles}</span>
                  <span className="jury-card-country">{m.country}</span>
                </button>
              ))}
            </div>
          ) : (
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
          )}
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
