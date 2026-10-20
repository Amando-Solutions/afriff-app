import { useEffect } from 'react';
import { ArrowRight, Bell } from 'lucide-react';
import { NEWS } from '../data/programme.js';
import { PageTitle } from '../components/Bits.jsx';
import { NEWS_TAGS, markAllNewsSeen, newsLink } from '../lib/alerts.js';

const when = (iso) => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
};

export default function News() {
  // opening News clears the count on the bell
  useEffect(() => { markAllNewsSeen(); }, []);

  return (
    <div className="page">
      <PageTitle icon={Bell}>News & alerts</PageTitle>
      <p className="muted">Changes to screenings and events, and festival news. Newest first.</p>
      {NEWS.length === 0 && <p className="empty">No news yet. Changes to the programme will appear here.</p>}
      <div className="stack" style={{ marginTop: 16 }}>
        {NEWS.map((n) => {
          const tag = NEWS_TAGS[n.type];
          const link = newsLink(n);
          const alert = tag?.tone === 'alert';
          return (
            <article key={n.id} className={`news-card${n.urgent || alert ? ' urgent' : ''}`}>
              <div className="news-tags">
                {tag && <span className={`label tone-${tag.tone}`}>{tag.text}</span>}
                {n.urgent && !tag && <span className="label tone-alert">Urgent</span>}
              </div>
              <h2 className="row-title news-title">{n.title}</h2>
              <p className="muted">{n.body}</p>
              <span className="muted small">{when(n.time)}</span>
              {link && <a className="btn btn-outline btn-small" href={link.href}>{link.label} <ArrowRight size={16} /></a>}
              {n.url && <a className="link" href={n.url} target="_blank" rel="noopener noreferrer">Read more on afriff.com →</a>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
