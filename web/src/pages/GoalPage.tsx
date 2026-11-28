import { useEffect, useState } from 'react';
import { RecordForm } from '../components/RecordForm';
import type { ActivityTemplate } from '../components/TemplateSelector';
import { ProgressBar } from '../components/ProgressBar';
import { HistoryTable } from '../components/HistoryTable';
import { ReminderSection } from '../components/ReminderSection';
import { GoalRevisionForm, type RevisionGoal } from '../components/GoalRevisionForm';

interface Goal extends RevisionGoal { template_id: string; }
interface DailyRecord { id: string; activity_date: string; quantity: number; }
interface Revision { id: string | null; version_number: number; target: number; end_date: string; effective_date: string; }

export const GoalPage = ({ goal, onGoalUpdated }: { goal: Goal; onGoalUpdated: (updatedGoal: Goal) => void }) => {
  const [template, setTemplate] = useState<ActivityTemplate | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [summary, setSummary] = useState<{ percent: number; total_recorded: number; streak_days: number } | null>(null);
  const [activeGoal, setActiveGoal] = useState<Goal>(goal);
  const [message, setMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [revisionFormOpen, setRevisionFormOpen] = useState(false);
  const load = async () => {
    try {
      setMessage(null); setNotFound(false);
      const [templatesResponse, summaryResponse] = await Promise.all([
        fetch('/api/activity-templates', { credentials: 'include' }),
        fetch(`/api/goals/${goal.id}/summary`, { credentials: 'include' }),
      ]);
      const templatesBody = await templatesResponse.json(); const summaryBody = await summaryResponse.json();
      if (summaryResponse.status === 404) { setNotFound(true); return; }
      if (!templatesResponse.ok || !summaryResponse.ok) throw new Error(summaryBody.error?.message || 'Unable to load activity history.');
      setTemplate((templatesBody.templates as ActivityTemplate[]).find((item) => item.id === goal.template_id) ?? null);
      setRecords(summaryBody.records);
      setSummary(summaryBody.summary);
      setRevisions(summaryBody.revisions);
      setActiveGoal(summaryBody.goal);
      onGoalUpdated(summaryBody.goal);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load activity history.'); }
  };
  useEffect(() => {
    setActiveGoal(goal);
    setSummary(null);
    setRecords([]);
    setRevisions([]);
    setRevisionFormOpen(false);
    void load();
  }, [goal.id]);

  if (notFound) return <section className="card empty" aria-label="Goal activity"><h3>Goal not found</h3><p>This goal does not exist or is not available to you.</p></section>;
  const unit = template?.unit ?? '';
  return <section className="stack" aria-label="Goal activity">
    <div className="card goal-hero">
      <div><h3>{template?.name ?? 'Goal'}</h3><p className="muted">Goal period: {activeGoal.start_date} to {activeGoal.end_date} · Version {activeGoal.version ?? 1}</p></div>
      {summary === null && !message ? <p aria-busy="true">Loading goal…</p> : summary !== null && <ProgressBar percent={summary.percent} />}
      {message && <p role="alert">{message}</p>}
      <div className="stats">
        <div className="stat"><span className="label">Recorded</span><span className="value">{summary?.total_recorded ?? '–'} {unit}</span></div>
        <div className="stat"><span className="label">Target</span><span className="value">{activeGoal.target} {unit}</span></div>
        <div className="stat"><span className="label">Days logged</span><span className="value">{records.length}</span></div>
        <div className="stat"><span className="label">Current streak</span><span className="value">{summary?.streak_days ?? '–'} days</span></div>
      </div>
    </div>
    <div className="card">
      <div className="revision-heading">
        <div><h3>Goal revision</h3><p className="muted">Update the target or end date without changing daily activity records.</p></div>
        <button type="button" className="btn-secondary" aria-expanded={revisionFormOpen} aria-controls="goal-revision-form" onClick={() => setRevisionFormOpen((open) => !open)}>Revise goal</button>
      </div>
      {revisionFormOpen && <div id="goal-revision-form"><GoalRevisionForm goal={activeGoal} onSaved={(updatedGoal) => {
        const updated = { ...activeGoal, ...updatedGoal };
        setActiveGoal(updated);
        onGoalUpdated(updated);
        void load();
      }} /></div>}
    </div>
    <div className="card">
      <h3>Record activity</h3>
      {template ? <RecordForm goalId={goal.id} minValue={template.min_value} maxValue={template.max_value} unit={template.unit} onSaved={() => { void load(); }} /> : <p role="alert">The activity template is unavailable.</p>}
    </div>
    <div className="card"><h4>Activity history</h4><HistoryTable records={records} unit={unit} /></div>
    <div className="card">
      <h4>Revision history</h4>
      {revisions.length ? <div className="table-wrap"><table aria-label="Revision history"><thead><tr><th>Version</th><th className="num">Target</th><th>End date</th><th>Effective date</th></tr></thead>
        <tbody>{revisions.map((revision) => <tr key={revision.id ?? revision.version_number}><td>Version {revision.version_number}</td><td className="num">{revision.target}</td><td>{revision.end_date}</td><td>{revision.effective_date}</td></tr>)}</tbody></table></div>
        : <p className="empty">Revision history is unavailable.</p>}
    </div>
    <ReminderSection goalId={goal.id} />
  </section>;
};
