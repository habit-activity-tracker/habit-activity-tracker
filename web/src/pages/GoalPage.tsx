import { useEffect, useState } from 'react';
import { RecordForm } from '../components/RecordForm';
import type { ActivityTemplate } from '../components/TemplateSelector';
import { ProgressBar } from '../components/ProgressBar';
import { HistoryTable } from '../components/HistoryTable';
import { ReminderSection } from '../components/ReminderSection';

interface Goal { id: string; template_id: string; target: number; start_date: string; end_date: string; version?: number; }
interface DailyRecord { id: string; activity_date: string; quantity: number; }

export const GoalPage = ({ goal }: { goal: Goal }) => {
  const [template, setTemplate] = useState<ActivityTemplate | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [percent, setPercent] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [version, setVersion] = useState<number>(goal.version ?? 1);
  const [message, setMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
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
      setPercent(summaryBody.summary.percent);
      setTotal(Number(summaryBody.summary.total_recorded));
      setStreak(Number(summaryBody.summary.streak_days));
      setVersion(Number(summaryBody.goal.version ?? goal.version ?? 1));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load activity history.'); }
  };
  useEffect(() => { setPercent(null); setTotal(null); setStreak(null); setRecords([]); void load(); }, [goal.id]);

  if (notFound) return <section className="card empty" aria-label="Goal activity"><h3>Goal not found</h3><p>This goal does not exist or is not available to you.</p></section>;
  const unit = template?.unit ?? '';
  return <section className="stack" aria-label="Goal activity">
    <div className="card goal-hero">
      <div><h3>{template?.name ?? 'Goal'}</h3><p className="muted">Goal period: {goal.start_date} to {goal.end_date} · Version {version}</p></div>
      {percent === null && !message ? <p aria-busy="true">Loading goal…</p> : percent !== null && <ProgressBar percent={percent} />}
      {message && <p role="alert">{message}</p>}
      <div className="stats">
        <div className="stat"><span className="label">Recorded</span><span className="value">{total ?? '–'} {unit}</span></div>
        <div className="stat"><span className="label">Target</span><span className="value">{goal.target} {unit}</span></div>
        <div className="stat"><span className="label">Days logged</span><span className="value">{records.length}</span></div>
        <div className="stat"><span className="label">Current streak</span><span className="value">{streak ?? '–'} days</span></div>
      </div>
    </div>
    <div className="card">
      <h3>Record activity</h3>
      {template ? <RecordForm goalId={goal.id} minValue={template.min_value} maxValue={template.max_value} unit={template.unit} onSaved={() => { void load(); }} /> : <p role="alert">The activity template is unavailable.</p>}
    </div>
    <div className="card"><h4>History</h4><HistoryTable records={records} unit={unit} /></div>
    <ReminderSection goalId={goal.id} />
  </section>;
};
