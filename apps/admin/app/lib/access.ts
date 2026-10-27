// Who may open which page of the staff app, and where people are sent.
//
// Addresses:
//   /login                         sign in / create an account (signed-out only)
//   /pending                       signed in, but no role yet (or the database can't be reached)
//   /door                          door volunteers' counter (no console around it)
//   /admin                         console home: one tile per section this role can open
//   /admin/team, /admin/approvals, /admin/publish, /admin/reports, /admin/mine
//   /admin/attendees               people signed up in the festival app (admins only)
//   /admin/emails                  festival emails to people who said yes (admins only)
//   /admin/contacts                contacts, groups, VIP sign-up links (admins and editors; links: admins)
//   /admin/invites, /admin/invites/<id>  invitations: editors prepare, ADMINS send (the server checks)
//   /admin/guests?invite=<id> | ?group=<id>  printable guest list (admins only)
//   /admin/data, /admin/data/<collection>, /admin/data/<collection>/<id or new>
//
// Each page names its section in definePageMeta({ section }); the global
// middleware (middleware/auth.global.ts) and a watcher (plugins/auth-guard.client.ts)
// both ask `redirectFor()` where someone should go, so a role given or taken
// away on the Team page moves people on by themselves.
import type { RouteLocationNormalized } from 'vue-router';
import type { Role } from './types';

export const ACCESS = {
  home: ['admin', 'editor', 'volunteer'],
  team: ['admin'],
  data: ['admin', 'editor'],
  publish: ['admin'],
  reports: ['admin'],
  // attendees' names and emails: admins only (firestore.rules agree)
  attendees: ['admin'],
  // writing to everyone who said yes to festival emails: admins only
  emails: ['admin'],
  // invitations: who can be invited (names, emails, groups) and the invites themselves.
  // Editors prepare and test; only admins send (server/invites/logic.ts, routes admin-only)
  contacts: ['admin', 'editor'],
  invites: ['admin', 'editor'],
  // the door team's printed list: admins only (firestore.rules agree)
  guests: ['admin'],
  approvals: ['admin'],
  mine: ['editor'],
  door: ['admin', 'volunteer'],
} satisfies Record<string, Role[]>;
export type SectionId = keyof typeof ACCESS;

export const canOpen = (role: Role | undefined, section: SectionId) => !!role && (ACCESS[section] as Role[]).includes(role);

/** Where someone lands after signing in (and when they open "/") */
export const homeFor = (role: Role) => (role === 'volunteer' ? '/door' : '/admin');

/** A ?redirect= value, only if it's an address inside this app */
function safeRedirect(value: unknown): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/login') && !v.startsWith('/pending') ? v : null;
}

interface AuthView {
  user: unknown;
  profile: { role: Role } | null;
  error: string | null;
}

/** Where to send someone opening `to`, or null to let them in. */
export function redirectFor(to: Pick<RouteLocationNormalized, 'path' | 'fullPath' | 'query' | 'meta'>, auth: AuthView): string | null {
  const back = safeRedirect(to.query.redirect);
  const keep = (path: string) => (back ? `${path}?redirect=${encodeURIComponent(back)}` : path);

  // signed out: everything goes to /login (remembering where they were headed)
  if (!auth.user) {
    if (to.path === '/login') return null;
    const target = safeRedirect(to.fullPath) && to.path !== '/' ? to.fullPath : back;
    return target ? `/login?redirect=${encodeURIComponent(target)}` : '/login';
  }

  // signed in, but no usable role yet
  const role = auth.profile?.role;
  if (auth.error || !role || role === 'pending') {
    if (to.path === '/pending') return null;
    return keep('/pending');
  }

  // signed in with a role: /, /login and /pending move on to where they belong
  if (to.path === '/' || to.path === '/login' || to.path === '/pending') return back || homeFor(role);

  const section = to.meta.section as SectionId | undefined;
  if (section && !canOpen(role, section)) return homeFor(role);
  return null;
}

// definePageMeta({ section }) is checked against the list above
declare module '#app' {
  interface PageMeta {
    /** which ACCESS entry decides who may open this page */
    section?: SectionId;
  }
}
