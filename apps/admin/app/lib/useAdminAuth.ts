import { reactive, watch } from 'vue';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
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
  error: null as string | null,
});
let started = false;

export function useAdminAuth() {
  if (!started) {
    started = true;
    let stopProfile = () => {};
    onAuthStateChanged(auth, (user) => {
      stopProfile();
      if (!user) {
        Object.assign(state, { loading: false, user: null, profile: null, error: null });
        return;
      }
      stopProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          // No profile yet: the sign-up page is creating it (or the screen offers a button)
          Object.assign(state, { loading: false, user, profile: snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null, error: null });
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

// For an account that exists without a team profile: create one with no access.
export const createProfile = (user: User, name?: string) =>
  setDoc(doc(db, 'users', user.uid), {
    email: user.email, name: (name || user.displayName || '').trim(), role: 'pending', venue: null, createdAt: serverTimestamp(),
  });
