import { signOut } from 'firebase/auth';
import { CheckSquare, ClipboardList, Database, LogOut, Users, UserCheck } from 'lucide-react';
import { auth } from './firebase.js';
import { ROLES, createProfile, useAdminAuth } from './useAdminAuth.js';
import Login from './Login.jsx';
import Team from './Team.jsx';
import { DataHome, DataList, ItemForm } from './DataScreens.jsx';
import { Approvals, MyChanges } from './Approvals.jsx';
import { useChanges } from './data.js';
import { COLLECTIONS } from './schema.js';
import DoorCounter from './DoorCounter.jsx';
import { venueById } from '../data/programme.js';
import './admin.css';

// What each role can open. "soon" = arrives in the next parts of step 2.
const SECTIONS = [
  { id: 'team', title: 'Team', text: 'Give people roles and venues', Icon: Users, roles: ['admin'] },
  { id: 'data', title: 'Festival data', text: 'Films, screenings, events, venues, news, sponsors, How to attend', Icon: Database, roles: ['admin', 'editor'] },
  { id: 'approvals', title: 'Approvals', text: 'Check editors\' changes before attendees see them', Icon: CheckSquare, roles: ['admin'] },
  { id: 'mine', title: 'My changes', text: 'Changes you sent for approval', Icon: ClipboardList, roles: ['editor'] },
  { id: 'door', title: 'Door counter', text: 'Big +1 / −1 buttons for queue and seats', Icon: UserCheck, roles: ['admin', 'volunteer'] },
];

function TopBar({ profile }) {
  return (
    <header className="ad-top">
      <a href="#/admin" className="ad-brand small"><img src="/logo.svg" alt="" width="28" height="28" /> <span>AFRIFF <em>Admin</em></span></a>
      <div className="ad-top-right">
        <span className="ad-role">{ROLES[profile.role]}</span>
        <button type="button" className="icon-btn" onClick={() => signOut(auth)} aria-label="Log out"><LogOut size={20} /></button>
      </div>
    </header>
  );
}

function PendingBadge() {
  const { items } = useChanges({ pendingOnly: true });
  return items?.length ? <span className="ad-count">{items.length} waiting</span> : null;
}

function Home({ profile }) {
  const mine = SECTIONS.filter((s) => s.roles.includes(profile.role));
  return (
    <div className="ad-page">
      <h1 className="ad-title">Hello{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}</h1>
      <p className="muted">
        You're logged in as <strong>{ROLES[profile.role]}</strong>
        {profile.role === 'volunteer' && profile.venue ? ` at ${venueById(profile.venue)?.name}` : ''}.
      </p>
      <div className="ad-tiles">
        {mine.map(({ id, title, text, Icon, soon }) => (
          <a key={id} href={soon ? undefined : `#/admin/${id}`} className={`ad-tile${soon ? ' soon' : ''}`} aria-disabled={soon || undefined}>
            <span className="icon-box"><Icon size={22} /></span>
            <span className="ad-tile-text">
              <span className="ad-tile-title">{title}{soon && <span className="ad-soon">Coming next</span>}{id === 'approvals' && <PendingBadge />}</span>
              <span className="muted small">{text}</span>
            </span>
          </a>
        ))}
      </div>
      <a className="link" href="#/">View the attendee app →</a>
    </div>
  );
}

function Waiting({ profile }) {
  return (
    <div className="ad-center">
      <div className="ad-card">
        <h1 className="ad-title">Almost there</h1>
        <p>Your account <strong>{profile.email}</strong> is set up, but an AFRIFF admin needs to give you a role before you can do anything.</p>
        <p className="muted small">Ask your team lead to open Team in the admin console. This page updates by itself once they do.</p>
        <button type="button" className="btn btn-outline btn-small" onClick={() => signOut(auth)}><LogOut size={16} /> Log out</button>
      </div>
    </div>
  );
}

export default function AdminApp({ param, rest = [] }) {
  const { loading, user, profile, error } = useAdminAuth();

  if (loading) return <div className="ad-center"><p className="muted">Loading…</p></div>;
  if (!user) return <Login />;
  if (error) {
    return (
      <div className="ad-center">
        <div className="ad-card">
          <h1 className="ad-title">Can't reach the database</h1>
          <p className="ad-error">{error}</p>
          <p className="muted small">Check the Firestore database exists and the rules from firestore.rules are published.</p>
          <button type="button" className="btn btn-outline btn-small" onClick={() => signOut(auth)}>Log out</button>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="ad-center">
        <div className="ad-card">
          <h1 className="ad-title">Finish setting up</h1>
          <p className="muted">Your login works, but your team profile is missing.</p>
          <button type="button" className="btn btn-gold btn-small" onClick={() => createProfile(user).catch(() => {})}>Finish setup</button>
        </div>
      </div>
    );
  }
  if (profile.role === 'pending') return <Waiting profile={profile} />;

  const section = SECTIONS.find((s) => s.id === param && !s.soon && s.roles.includes(profile.role));
  return (
    <div className="ad">
      <TopBar profile={profile} />
      <Section section={section} rest={rest} profile={profile} />
    </div>
  );
}

function Section({ section, rest, profile }) {
  switch (section?.id) {
    case 'team':
      return <Team me={profile} />;
    case 'approvals':
      return <Approvals profile={profile} />;
    case 'door':
      return <DoorCounter profile={profile} />;
    case 'mine':
      return <MyChanges profile={profile} />;
    case 'data': {
      const [col, id] = rest;
      if (col && !COLLECTIONS[col]) return <DataHome profile={profile} />;
      if (col && id) return <ItemForm key={col + id} col={col} id={id} profile={profile} />;
      if (col) return <DataList col={col} />;
      return <DataHome profile={profile} />;
    }
    default:
      return <Home profile={profile} />;
  }
}
