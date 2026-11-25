export interface ReminderInput { local_time: string; days_of_week: number[]; enabled: boolean; }
export type ReminderValidation = { valid: true; value: ReminderInput } | { valid: false; details: Record<string, string> };

export const validateReminder = (input: unknown): ReminderValidation => {
  const details: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, details: { body: 'A reminder schedule object is required.' } };
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) if (!['local_time', 'days_of_week', 'enabled'].includes(key)) details[key] = 'This field is not allowed.';
  if (typeof body.local_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.local_time)) details.local_time = 'Local time must use HH:MM format.';
  if (!Array.isArray(body.days_of_week) || body.days_of_week.length < 1 || body.days_of_week.length > 7 || body.days_of_week.some((day) => !Number.isInteger(day) || day < 1 || day > 7) || new Set(body.days_of_week).size !== body.days_of_week.length) {
    details.days_of_week = 'Days of week must contain one to seven unique ISO weekday values from 1 to 7.';
  }
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') details.enabled = 'Enabled must be a boolean.';
  if (Object.keys(details).length) return { valid: false, details };
  return { valid: true, value: { local_time: body.local_time as string, days_of_week: [...(body.days_of_week as number[])].sort((a, b) => a - b), enabled: body.enabled === undefined ? true : body.enabled as boolean } };
};
