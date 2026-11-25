import type { Clock } from '../utils/clock.js';

export interface ReminderSchedule { id: string; goal_id: string; local_time: string; days_of_week: number[]; enabled: boolean; created_at: string; updated_at: string; }

export const isoTimestamp = (value: unknown): string => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();

const localParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), weekday: weekdays[values.weekday] };
};

const localDateTimeToUtc = (year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date => {
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 3; i += 1) {
    const parts = localParts(candidate, timeZone);
    const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const wanted = Date.UTC(year, month - 1, day, hour, minute);
    candidate = new Date(candidate.getTime() + (wanted - shown));
  }
  return candidate;
};

const addDays = (year: number, month: number, day: number, amount: number) => {
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

export const nextOccurrence = (schedule: Pick<ReminderSchedule, 'local_time' | 'days_of_week' | 'enabled'>, goalEndDate: string, clock: Clock, timeZone: string): string | null => {
  const now = clock.now?.() ?? new Date();
  const today = clock.today(timeZone);
  if (!schedule.enabled || goalEndDate < today) return null;
  const current = localParts(now, timeZone);
  const [hour, minute] = schedule.local_time.split(':').map(Number);
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = addDays(current.year, current.month, current.day, offset);
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() || 7;
    if (!schedule.days_of_week.includes(weekday) || `${date.year.toString().padStart(4, '0')}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}` > goalEndDate) continue;
    const candidate = localDateTimeToUtc(date.year, date.month, date.day, hour, minute, timeZone);
    if (candidate.getTime() > now.getTime()) return candidate.toISOString();
  }
  return null;
};
