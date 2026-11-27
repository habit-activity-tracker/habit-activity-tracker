export interface GoalInput { template_id: string; target: number; start_date: string; end_date: string; }
export type GoalValidationResult = { valid: true; value: GoalInput } | { valid: false; details: Record<string, string> };

const allowedFields = new Set(['template_id', 'target', 'start_date', 'end_date', 'participantId']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const maxRevisionTarget = 99_999_999.99;

const validDate = (value: string): boolean => {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const todayInTimezone = (timezone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const isUuid = (value: unknown): value is string => typeof value === 'string' && uuidPattern.test(value);

export const validateGoal = (input: unknown, timezone: string): GoalValidationResult => {
  const details: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, details: { body: 'A goal object is required.' } };
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) if (!allowedFields.has(key)) details[key] = 'This field is not allowed.';
  if (!isUuid(body.template_id)) details.template_id = 'Template ID must be a valid UUID.';
  if (typeof body.target !== 'number' || !Number.isFinite(body.target) || body.target <= 0) details.target = 'Target must be a positive number.';
  if (typeof body.start_date !== 'string' || !validDate(body.start_date)) details.start_date = 'Start date must be a valid calendar date.';
  if (typeof body.end_date !== 'string' || !validDate(body.end_date)) details.end_date = 'End date must be a valid calendar date.';
  if (typeof body.start_date === 'string' && validDate(body.start_date) && body.start_date > todayInTimezone(timezone)) details.start_date = 'Start date cannot be in the future.';
  if (typeof body.start_date === 'string' && typeof body.end_date === 'string' && validDate(body.start_date) && validDate(body.end_date) && body.end_date < body.start_date) details.end_date = 'End date must be on or after start date.';
  if (Object.keys(details).length) return { valid: false, details };
  return { valid: true, value: { template_id: body.template_id as string, target: body.target as number, start_date: body.start_date as string, end_date: body.end_date as string } };
};

export interface GoalRevisionInput { target: number; end_date: string; }
export type GoalRevisionValidationResult = { valid: true; value: GoalRevisionInput } | { valid: false; details: Record<string, string> };

const revisionAllowedFields = new Set(['target', 'end_date']);

export const validateGoalRevision = (input: unknown, goalStartDate?: string): GoalRevisionValidationResult => {
  const details: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, details: { body: 'A revision object is required.' } };
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) if (!revisionAllowedFields.has(key)) details[key] = 'This field is not allowed.';
  if (typeof body.target !== 'number' || !Number.isFinite(body.target) || body.target <= 0) {
    details.target = 'Target must be a positive number.';
  } else if (body.target > maxRevisionTarget || Number(body.target.toFixed(2)) !== body.target || Number(body.target.toFixed(2)) <= 0) {
    details.target = 'Target must be between 0.01 and 99,999,999.99, with at most two decimal places.';
  }
  if (typeof body.end_date !== 'string' || !validDate(body.end_date)) details.end_date = 'End date must be a valid calendar date.';
  if (typeof body.end_date === 'string' && validDate(body.end_date) && goalStartDate && validDate(goalStartDate) && body.end_date < goalStartDate) {
    details.end_date = 'End date must be on or after start date.';
  }
  if (Object.keys(details).length) return { valid: false, details };
  return { valid: true, value: { target: body.target as number, end_date: body.end_date as string } };
};
