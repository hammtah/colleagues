import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { user, login, register, resetPassword, loading, isFirebaseConfigured } = useAuth();
  // mode: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccessMsg('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(email, password, displayName);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMsg(
          `A password-reset link has been sent to ${email}. Check your inbox (and spam folder).`
        );
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Colleagues</h1>
          <p>
            Firebase is not configured yet. Copy <code>.env.example</code> to{' '}
            <code>.env.local</code>, fill in your Firebase web app keys and moderator UID, then
            restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  const titles = { login: 'Sign in', register: 'Create account', forgot: 'Reset password' };
  const submitLabels = { login: 'Sign in', register: 'Create account', forgot: 'Send reset link' };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Colleagues</h1>
        {mode !== 'forgot' && (
          <p className="lede">Sign in to track the shared concept of the month.</p>
        )}
        {mode === 'forgot' && (
          <p className="lede">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>
        )}

        <form className="stack-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          {mode !== 'forgot' && (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
          )}

          <button type="submit" className="btn" disabled={busy || loading}>
            {submitLabels[mode]}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {successMsg && <p className="success">{successMsg}</p>}

        {/* Footer links */}
        {mode === 'login' && (
          <div className="auth-footer">
            <button
              type="button"
              className="linkish"
              onClick={() => switchMode('forgot')}
            >
              Forgot password?
            </button>
            <hr className="auth-divider" />
            <button
              type="button"
              className="linkish"
              onClick={() => switchMode('register')}
            >
              Need an account? <strong>Register</strong>
            </button>
          </div>
        )}

        {mode === 'register' && (
          <div className="auth-footer">
            <button
              type="button"
              className="linkish"
              onClick={() => switchMode('login')}
            >
              Have an account? <strong>Sign in</strong>
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="auth-footer">
            <button
              type="button"
              className="linkish"
              onClick={() => switchMode('login')}
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
