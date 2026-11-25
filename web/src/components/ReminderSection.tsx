import { FormEvent, useEffect, useState } from 'react';

interface Reminder { id: string; local_time: string; days_of_week: number[]; enabled: boolean; next_occurrence_at: string | null; }
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ReminderSection = ({ goalId }: { goalId: string }) => {
  const [schedules, setSchedules] = useState<Reminder[]>([]);
  const [time, setTime] = useState('08:30');
  const [days, setDays] = useState<number[]>([1]);
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const response = await fetch(`/api/goals/${goalId}/reminder-schedules`, { credentials: 'include' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || 'Unable to load reminders.');
    setSchedules(body.schedules ?? []);
  };
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load reminders.')); }, [goalId]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/goals/${goalId}/reminder-schedules`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ local_time: time, days_of_week: days, enabled }) });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error?.message || 'Unable to save reminder.'); return; }
      await load(); setMessage('Reminder saved.');
    } catch { setMessage('Unable to save reminder.'); } finally { setSaving(false); }
  };
  const toggleDay = (day: number) => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b));
  return <section className="card" aria-label="Reminders">
    <h4>Reminders</h4>
    {schedules.length === 0 ? <p className="muted">No reminders scheduled.</p> : <ul>{schedules.map((schedule) => <li key={schedule.id}>{schedule.local_time} · {schedule.days_of_week.map((day) => weekdayLabels[day - 1]).join(', ')} · {schedule.next_occurrence_at ? `Next occurrence ${schedule.next_occurrence_at}` : 'No upcoming occurrence'}</li>)}</ul>}
    {schedules.length < 3 && <form onSubmit={submit} aria-label="Create reminder">
      <label>Local time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
      <fieldset><legend>Days</legend>{weekdayLabels.map((label, index) => <label key={label}><input type="checkbox" checked={days.includes(index + 1)} onChange={() => toggleDay(index + 1)} />{label}</label>)}</fieldset>
      <label><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> Enabled</label>
      {message && <p role="alert">{message}</p>}
      <button type="submit" disabled={saving || days.length === 0}>{saving ? 'Saving…' : 'Add reminder'}</button>
    </form>}
    {schedules.length >= 3 && <p className="muted">Maximum of three reminders reached.</p>}
  </section>;
};
