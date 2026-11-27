import { FormEvent, useEffect, useState } from 'react';
import { TemplateSelector, type ActivityTemplate } from '../components/TemplateSelector';

const todayBangkok = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
type CreatedGoal = { id: string };

export const NewGoalPage = ({ onCreated }: { onCreated?: (goal: CreatedGoal) => void }) => {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [selected, setSelected] = useState<ActivityTemplate | null>(null);
  const [target, setTarget] = useState(''); const [startDate, setStartDate] = useState(todayBangkok()); const [endDate, setEndDate] = useState(todayBangkok());
  const [errors, setErrors] = useState<Record<string, string>>({}); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { fetch('/api/activity-templates', { credentials: 'include' }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Unable to load templates.'); setTemplates(body.templates); }).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Unable to load templates.')).finally(() => setLoading(false)); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setErrors({}); setMessage(null); setSaving(true);
    try {
      const response = await fetch('/api/goals', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template_id: selected?.id, target: Number(target), start_date: startDate, end_date: endDate }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setErrors(body.error?.details ?? {}); setMessage(body.error?.message ?? 'Unable to create goal.'); return; }
      setMessage('Goal created.'); setTarget(''); onCreated?.(body.goal as CreatedGoal);
    } catch { setMessage('Unable to create goal. Please try again.'); } finally { setSaving(false); }
  };
  return <section className="card" aria-label="Create personal goal"><h2>Create personal goal</h2>
    {loading ? <p aria-busy="true">Loading activity templates…</p> : <TemplateSelector templates={templates} onSelect={setSelected} selectedId={selected?.id} />}
    {selected && <p className="muted" role="status">Selected: {selected.name} ({selected.unit}), range {selected.min_value}–{selected.max_value}</p>}
    <form onSubmit={submit}>
      <label>Target<input type="number" min="0" step="any" value={target} onChange={(event) => setTarget(event.target.value)} required /></label>{errors.target && <p role="alert">{errors.target}</p>}
      <div className="field-row"><label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
      <label>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label></div>{errors.start_date && <p role="alert">{errors.start_date}</p>}{errors.end_date && <p role="alert">{errors.end_date}</p>}
      {errors.template_id && <p role="alert">{errors.template_id}</p>}{message && <p role={Object.keys(errors).length ? 'alert' : 'status'}>{message}</p>}
      <button type="submit" disabled={saving || !selected}>{saving ? 'Saving…' : 'Create goal'}</button>
    </form>
  </section>;
};
