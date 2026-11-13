import { FormEvent, useState } from 'react';
import { login, type User } from '../auth/authApi';

export const LoginPage = ({ onSuccess }: { onSuccess: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setSubmitting(true);
    try { onSuccess(await login(email, password)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.'); }
    finally { setSubmitting(false); }
  };

  return <main className="login-wrap"><div className="card login-card">
    <h1>Habit &amp; Activity Tracker</h1><h2>Sign in</h2>
    <p className="release-banner" role="status">🚀 Lab 5 Release: Continuous Deployment Active</p>
    <form onSubmit={submit} aria-label="Login form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </div></main>;
};
