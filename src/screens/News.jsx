import { Bell } from 'lucide-react';
import { NEWS } from '../data/programme.js';
import { PageTitle } from '../components/Bits.jsx';

const when = (iso) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export default function News() {
  return (
    <div className="page">
      <PageTitle icon={Bell}>News & alerts</PageTitle>
      <div className="stack" style={{ marginTop: 20 }}>
        {NEWS.map((n) => (
          <article key={n.id} className={`news-card${n.urgent ? ' urgent' : ''}`}>
            {n.urgent && <span className="label tone-alert">Urgent</span>}
            <h2 className="row-title">{n.title}</h2>
            <p className="muted">{n.body}</p>
            <span className="muted small">{when(n.time)}</span>
            {n.url && <a className="link" href={n.url} target="_blank" rel="noopener noreferrer">Read on afriff.com →</a>}
          </article>
        ))}
      </div>
    </div>
  );
}
