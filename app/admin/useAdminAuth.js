import { reactive } from 'vue';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

export const ROLES = {
  pending: 'No access yet',
  volunteer: 'Door volunteer',
  editor: 'Editor',
  admin: 'Admin',
};

// Who is logged in, and their team profile (role, venue). One shared copy for the console.
const state = reactive({ loading: true, user: null, profile: null, error: null });
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
          Object.assign(state, { loading: false, user, profile: snap.exists() ? { id: snap.id, ...snap.data() } : null, error: null });
        },
        (e) => Object.assign(state, { loading: false, user, profile: null, error: e.message }),
      );
    });
  }
  return state;
}

// For an account that exists without a team profile: create one with no access.
export const createProfile = (user, name) =>
  setDoc(doc(db, 'users', user.uid), {
    email: user.email, name: (name || user.displayName || '').trim(), role: 'pending', venue: null, createdAt: serverTimestamp(),
  });
