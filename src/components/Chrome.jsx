import { Bell, CalendarDays, Home, Users, BookmarkCheck } from 'lucide-react';
import { useUnreadCount } from '../lib/alerts.js';
import { openQueues, useLiveClock } from '../lib/queues.js';

// Header and bottom navigation shown on every screen.

export function Header() {
  const unread = useUnreadCount(); // news this phone hasn't seen yet
  return (
    <header className="header">
      <a href="#/" className="brand" aria-label="AFRIFF home">
        <img src="/logo.svg" alt="" width="40" height="40" />
        <span>AFRIFF</span>
      </a>
      <a href="#/news" className="bell" aria-label={`News and alerts, ${unread} new`}>
        <Bell size={26} strokeWidth={1.8} />
        {unread > 0 && <span className="badge">{unread}</span>}
      </a>
    </header>
  );
}

const TABS = [
  { name: 'home', label: 'Home', href: '#/', Icon: Home },
  { name: 'programme', label: 'Programme', href: '#/programme', Icon: CalendarDays },
  { name: 'queues', label: 'Queues', href: '#/queues', Icon: Users },
  { name: 'my', label: 'My Festival', href: '#/my', Icon: BookmarkCheck },
];

export function BottomNav({ active }) {
  // gold dot on Queues while any queue is open (no words needed)
  const queuesLive = openQueues(useLiveClock()).length > 0;
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ name, label, href, Icon }) => {
        const on = active === name;
        return (
          <a key={name} href={href} className={`tab${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
            <span className="tab-icon"><Icon size={24} strokeWidth={1.8} />{name === 'queues' && queuesLive && <span className="tab-dot" aria-label="Queues open now" />}</span>
            <span className="tab-label">{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
