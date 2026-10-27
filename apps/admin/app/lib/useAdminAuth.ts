import { reactive, watch } from 'vue';
import { onAuthStateChanged, reload, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { isSuperadminLogin, needsOwnerCheck } from '#shared/team';
import { auth, db } from './firebase';
import type { Profile, Role } from './types';

export const ROLES: Record<Role, string> = {
  pending: 'No access yet',
  volunteer: 'Door volunteer',
  editor: 'Editor',
  admin: 'Admin',
};

// Who is logged in, and their team profile (role, venue). One shared copy for the console.
const state = reactive({
  loading: true,
  user: null as User | null,
  profile: null as Profile | null,
  /** one of the app's two owners (shared/team.ts), email confirmed: may remove admins */
  superadmin: false,
  /** one of those emails, not confirmed yet (AdminOwnerCheck offers the link) */
  ownerCheck: false,
  error: null as string | null,
});
let started = false;
let healed = '';

// A superadmin's profile always says 'admin' (all other admins ever see). Put
// it back if it says anything else; once per sign-in, so old database rules
// refusing the write can't make it loop.
function keepOwnerAdmin(user: User, profile: Profile | null, again = false) {
  if (!profile || profile.role === 'admin' || !isSuperadminLogin(user) || (healed === user.uid && !again)) return;
  healed = user.uid;
  updateDoc(doc(db, 'users', user.uid), { role: 'admin', venue: null }).catch(() => {});
}

export function useAdminAuth() {
  if (!started) {
    started = true;
    let stopProfile = () => {};
    onAuthStateChanged(auth, (user) => {
      stopProfile();
      if (!user) {
        healed = '';
        Object.assign(state, { loading: false, user: null, profile: null, superadmin: false, ownerCheck: false, error: null });
        return;
      }
      stopProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          // No profile yet: the sign-up page is creating it (or the screen offers a button)
          const profile = snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null;
          const superadmin = isSuperadminLogin(user);
          // a superadmin is an admin (as the database rules and the server see it) even before their profile says so
          const shown = profile && superadmin ? { ...profile, role: 'admin' as Role, venue: null } : profile;
          Object.assign(state, { loading: false, user, profile: shown, superadmin, ownerCheck: needsOwnerCheck(user), error: null });
          keepOwnerAdmin(user, profile);
        },
        (e) => Object.assign(state, { loading: false, user, profile: null, error: e.message }),
      );
    });
  }
  return state;
}

/** The shared state, once Firebase has said who's signed in (and their profile has loaded). */
export function whenAuthReady(): Promise<typeof state> {
  const s = useAdminAuth();
  if (!s.loading) return Promise.resolve(s);
  return new Promise((resolve) => {
    const stop = watch(() => s.loading, (loading) => {
      if (loading) return;
      stop();
      resolve(s);
    });
  });
}

/** Superadmin emails only: Firebase emails a link that confirms the address is theirs. */
export const sendOwnerCheck = () => (auth.currentUser ? sendEmailVerification(auth.currentUser) : Promise.resolve());

/** After tapping that link: ask Firebase again (and get a fresh sign-in, so the database sees it too). */
export async function recheckOwner(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await reload(user);
  await user.getIdToken(true);
  const profile = state.profile;
  Object.assign(state, { superadmin: isSuperadminLogin(user), ownerCheck: needsOwnerCheck(user) });
  keepOwnerAdmin(user, profile, true);
  if (profile && state.superadmin) state.profile = { ...profile, role: 'admin', venue: null };
  return state.superadmin;
}

// For an account that exists without a team profile: create one with no access.
export const createProfile = (user: User, name?: string) =>
  setDoc(doc(db, 'users', user.uid), {
    email: user.email, name: (name || user.displayName || '').trim(), role: 'pending', venue: null, createdAt: serverTimestamp(),
  });

// Logging in with a login made in the festival app (both apps share one list
// of logins): it has no team profile yet, so add the "No access yet" one and
// admins see them on Team. Never touches a profile that exists.
export async function ensureProfile(user: User) {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) await createProfile(user);
}
