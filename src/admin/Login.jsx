import { useState } from 'react';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createProfile } from './useAdminAuth.js';
import { auth } from './firebase.js';

// Plain-language versions of Firebase's error codes
const MESSAGES = {
  'auth/invalid-credential': 'That email and password don\'t match. Check them and try again.',
  'auth/invalid-email': 'That doesn\'t look like an email address.',
  'auth/email-already-in-use': 'There\'s already an account with this email. Log in instead.',
  'auth/weak-password': 'Use a password of at least 6 characters.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/missing-email': 'Type your email first.',
};
const friendly = (e) => MESSAGES[e.code] || `Something went wrong (${e.code || e.message}).`;

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNote('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(user, { displayName: name.trim() });
        await createProfile(user, name);
      }
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError('');
    setNote('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNote('If that email has an account, a reset link is on its way. Check your inbox and spam.');
    } catch (err) {
      setError(friendly(err));
    }
  };

  return (
    <div className="ad-center">
      <div className="ad-card ad-login">
        <div className="ad-brand"><img src="/logo.svg" alt="" width="36" height="36" /> <span>AFRIFF <em>Admin</em></span></div>
        <p className="muted small">For the AFRIFF team and door volunteers.</p>

        <div className="seg ad-seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Create account</button>
        </div>

        <form onSubmit={submit} className="ad-form">
          {mode === 'signup' && (
            <label>Your name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
          )}
          <label>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {error && <p className="ad-error" role="alert">{error}</p>}
          {note && <p className="ad-note">{note}</p>}
          <button type="submit" className="btn btn-gold ad-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        {mode === 'login' ? (
          <button type="button" className="link ad-forgot" onClick={reset}>Forgot password?</button>
        ) : (
          <p className="muted small">New accounts start with no access. An AFRIFF admin will give you a role.</p>
        )}
      </div>
      <a className="link" href="#/">← Back to the festival app</a>
    </div>
  );
}
