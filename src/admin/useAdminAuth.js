import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

export const ROLES = {
  pending: 'No access yet',
  volunteer: 'Door volunteer',
  editor: 'Editor',
  admin: 'Admin',
};

// Who is logged in, and their team profile (role, venue).
export function useAdminAuth() {
  const [state, setState] = useState({ loading: true, user: null, profile: null, error: null });

  useEffect(() => {
    let stopProfile = () => {};
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopProfile();
      if (!user) {
        setState({ loading: false, user: null, profile: null, error: null });
        return;
      }
      const ref = doc(db, 'users', user.uid);
      stopProfile = onSnapshot(
        ref,
        (snap) => {
          // No profile yet: the sign-up page is creating it (or the screen offers a button)
          setState({ loading: false, user, profile: snap.exists() ? { id: snap.id, ...snap.data() } : null, error: null });
        },
        (e) => setState({ loading: false, user, profile: null, error: e.message })
      );
    });
    return () => {
      stopAuth();
      stopProfile();
    };
  }, []);

  return state;
}

// For an account that exists without a team profile: create one with no access.
export const createProfile = (user, name) =>
  setDoc(doc(db, 'users', user.uid), {
    email: user.email, name: (name || user.displayName || '').trim(), role: 'pending', venue: null, createdAt: serverTimestamp(),
  });
