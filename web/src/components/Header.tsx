import { useEffect, useState } from 'react';
import type { User } from '../auth/authApi';
import { logout } from '../auth/authApi';

export const Header = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const [buildVersion, setBuildVersion] = useState('Loading build version…');
  useEffect(() => {
    let active = true;
    fetch('/api/health').then(async (response) => {
      if (!response.ok) throw new Error('Unable to load build version.');
      const body = await response.json() as { commit?: unknown };
      if (typeof body.commit !== 'string' || !/^[0-9a-f]{40}$/i.test(body.commit)) {
        throw new Error('Build version is unavailable.');
      }
      if (active) setBuildVersion(body.commit);
    }).catch(() => {
      if (active) setBuildVersion('Build version unavailable');
    });
    return () => { active = false; };
  }, []);
  const signOut = async () => { await logout(); onLogout(); };
  return <header className="app-header">
    <span className="brand">Habit &amp; Activity Tracker</span>
    <div className="header-user">
      <span className="release-badge" title={buildVersion}>{buildVersion.length === 40 ? `Build ${buildVersion.slice(0, 7)}` : buildVersion}</span>
      <span>Signed in as {user.email}</span>
      <span className="role-badge">{user.role.replace('_', ' ')}</span>
      <button type="button" className="btn-ghost" onClick={signOut}>Logout</button>
    </div>
  </header>;
};
