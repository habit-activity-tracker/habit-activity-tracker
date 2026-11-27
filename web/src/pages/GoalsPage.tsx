import { useEffect, useState, type ReactNode } from 'react';
import { GoalPage } from './GoalPage';
import type { ActivityTemplate } from '../components/TemplateSelector';

interface Goal { id: string; template_id: string; target: number; start_date: string; end_date: string; }

export const GoalsPage = ({ refreshKey = 0, children }: { refreshKey?: number; children?: ReactNode }) => {
  const [goals, setGoals] = useState<Goal[]>([]); const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    fetch('/api/activity-templates', { credentials: 'include' }).then((r) => r.json()).then((b) => setTemplates(b.templates ?? [])).catch(() => undefined);
    fetch('/api/goals', { credentials: 'include' }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load goals.'); setGoals(body.goals); const remembered = localStorage.getItem('selectedGoalId'); setSelectedGoal(body.goals.find((goal: Goal) => goal.id === remembered) ?? null); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load goals.')).finally(() => setLoading(false));
  }, [refreshKey]);
  const select = (goal: Goal) => { localStorage.setItem('selectedGoalId', goal.id); setSelectedGoal(goal); };
  const updateGoal = (updatedGoal: Goal) => {
    setGoals((current) => current.map((goal) => goal.id === updatedGoal.id ? updatedGoal : goal));
    setSelectedGoal((current) => current?.id === updatedGoal.id ? updatedGoal : current);
  };
  const nameOf = (goal: Goal) => templates.find((item) => item.id === goal.template_id)?.name ?? 'Goal';
  return <div className="grid-sidebar">
    <div className="stack">
      <section className="card" aria-label="My goals"><h2>My goals</h2>
        {loading ? <p aria-busy="true">Loading goals…</p> : error ? <p role="alert">{error}</p> : goals.length === 0 ? <p className="empty">No goals yet.</p> :
          <ul className="goal-list">{goals.map((goal) => <li key={goal.id} className="goal-item" aria-current={selectedGoal?.id === goal.id}>
            <span className="title">{nameOf(goal)}</span>
            <span className="meta">Target {goal.target} · {goal.start_date} to {goal.end_date}</span>
            <button type="button" className="btn-ghost" onClick={() => select(goal)}>Record activity</button>
          </li>)}</ul>}
      </section>
      {children}
    </div>
    <div>{selectedGoal ? <GoalPage goal={selectedGoal} onGoalUpdated={updateGoal} /> : <p className="card empty">Select a goal to record activity and see your progress.</p>}</div>
  </div>;
};
