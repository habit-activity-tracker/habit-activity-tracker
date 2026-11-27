import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { currentUser, type User } from './auth/authApi';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { GoalsPage } from './pages/GoalsPage';
import { NewGoalPage } from './pages/NewGoalPage';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalRefresh, setGoalRefresh] = useState(0);
  const [requestedGoalId, setRequestedGoalId] = useState<string | null>(null);
  const redirectForRole = (nextUser: User) => {
    const destination = nextUser.role === 'program_manager' ? '/manager' : '/participant';
    if (window.location.pathname !== destination) window.history.replaceState({}, '', destination);
    setUser(nextUser);
  };
  const signOut = () => {
    window.history.replaceState({}, '', '/login');
    setUser(null);
  };
  useEffect(() => { currentUser().then((nextUser) => { if (nextUser) redirectForRole(nextUser); }).finally(() => setLoading(false)); }, []);
  if (loading) return <main className="container" aria-busy="true">Loading your session…</main>;
  if (!user) return <LoginPage onSuccess={redirectForRole} />;
  return <ProtectedRoute user={user} loading={loading} onUnauthenticated={() => setUser(null)}>
    <Header user={user!} onLogout={signOut} />
    <main className="container stack">
      {user!.role === 'participant' && <GoalsPage refreshKey={goalRefresh} requestedGoalId={requestedGoalId} onGoalSelected={() => setRequestedGoalId(null)}><NewGoalPage onCreated={(goal) => { setRequestedGoalId(goal.id); setGoalRefresh((value) => value + 1); }} /></GoalsPage>}
      <TemplatesPage user={user!} />
    </main>
  </ProtectedRoute>;
};

createRoot(document.getElementById('root')!).render(<App />);
