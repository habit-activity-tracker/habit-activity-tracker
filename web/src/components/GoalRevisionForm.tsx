import { FormEvent, useEffect, useState } from 'react';

export interface RevisionGoal {
  id: string;
  target: number;
  start_date: string;
  end_date: string;
  version?: number;
}

const validate = (target: string, endDate: string, startDate: string): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!target.trim() || !Number.isFinite(Number(target))) {
    errors.target = 'Enter a numeric target.';
  } else if (Number(target) <= 0) {
    errors.target = 'Target must be greater than zero.';
  } else if (Number(target) > 99_999_999.99 || Number(Number(target).toFixed(2)) !== Number(target)) {
    errors.target = 'Target must be at most 99,999,999.99 with no more than two decimal places.';
  }
  if (!endDate) errors.end_date = 'End date is required.';
  else if (endDate < startDate) errors.end_date = 'End date cannot be earlier than the start date.';
  return errors;
};

export const GoalRevisionForm = ({ goal, onSaved }: { goal: RevisionGoal; onSaved: (updatedGoal: RevisionGoal) => void }) => {
  const [target, setTarget] = useState(String(goal.target));
  const [endDate, setEndDate] = useState(goal.end_date);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTarget(String(goal.target));
    setEndDate(goal.end_date);
    setServerErrors({});
  }, [goal.id, goal.target, goal.end_date]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setServerErrors({});
    setMessage(null);
    const validationErrors = validate(target, endDate, goal.start_date);
    if (Object.keys(validationErrors).length) {
      setServerErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/goals/${goal.id}/revisions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: Number(target), end_date: endDate }),
      });
      const body = await response.json().catch(() => ({})) as {
        goal?: RevisionGoal;
        error?: { message?: string; details?: Record<string, string> };
      };
      if (!response.ok) {
        setServerErrors(body.error?.details ?? {});
        setMessage(body.error?.message ?? 'Unable to save the goal revision.');
        return;
      }
      if (!body.goal) throw new Error('The revision response did not include the updated goal.');
      setMessage('Goal revision saved.');
      onSaved(body.goal);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the goal revision. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const liveErrors = validate(target, endDate, goal.start_date);
  return <form className="goal-revision-form" onSubmit={submit} aria-label="Revise goal form">
    <label>New target
      <input type="number" min="0.01" max="99999999.99" step="0.01" value={target} onChange={(event) => { setTarget(event.target.value); setServerErrors({}); }} required aria-invalid={Boolean(liveErrors.target || serverErrors.target)} />
    </label>
    {(liveErrors.target || serverErrors.target) && <p role="alert">{serverErrors.target ?? liveErrors.target}</p>}
    <label>Start date
      <input type="date" value={goal.start_date} readOnly aria-readonly="true" />
    </label>
    <label>New end date
      <input type="date" value={endDate} min={goal.start_date} onChange={(event) => { setEndDate(event.target.value); setServerErrors({}); }} required aria-invalid={Boolean(liveErrors.end_date || serverErrors.end_date)} />
    </label>
    {(liveErrors.end_date || serverErrors.end_date) && <p role="alert">{serverErrors.end_date ?? liveErrors.end_date}</p>}
    {message && <p role={message === 'Goal revision saved.' ? 'status' : 'alert'}>{message}</p>}
    <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save revision'}</button>
  </form>;
};
