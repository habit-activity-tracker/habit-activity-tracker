import type { User } from '../auth/authApi';
import { logout } from '../auth/authApi';

export const Header = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const signOut = async () => { await logout(); onLogout(); };
  return <header className="app-header">
    <span className="brand">Habit &amp; Activity Tracker</span>
    <div className="header-user">
      <span className="release-badge" title="Lab 5 Release: Continuous Deployment Active">🚀 CD Active</span>
      <span>Signed in as {user.email}</span>
      <span className="role-badge">{user.role.replace('_', ' ')}</span>
      <button type="button" className="btn-ghost" onClick={signOut}>Logout</button>
    </div>
  </header>;
};
