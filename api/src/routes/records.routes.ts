import { Router } from 'express';
import type { Pool } from 'pg';
import type { AppConfig } from '../config/env.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { AppError, ErrorCode } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireOwnedGoal } from '../middleware/goalOwnership.js';
import { AuthService } from '../services/auth.service.js';
import { systemClock, type Clock } from '../utils/clock.js';
import { validateQuantityRange, validateRecord } from '../validators/record.js';

const recordColumns = "id, goal_id, to_char(activity_date, 'YYYY-MM-DD') AS activity_date, quantity, created_at";
const mapRecord = (row: Record<string, unknown>) => ({ ...row, quantity: Number(row.quantity), activity_date: String(row.activity_date) });

export const MAX_BACKDATE_DAYS = 7;

export const computeEarliestDate = (todayStr: string, maxBackdateDays: number = MAX_BACKDATE_DAYS, timeZone: string = 'Asia/Bangkok'): string => {
  const date = new Date(`${todayStr}T12:00:00+07:00`);
  date.setDate(date.getDate() - maxBackdateDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const createRecordsRouter = (pool: Pool, config: AppConfig, clock: Clock = systemClock): Router => {
  const router = Router({ mergeParams: true });
  const authService = new AuthService(pool, config);
  const protections = [requireAuth(authService), requireRole('participant'), requireOwnedGoal(pool)];

  router.post('/', ...protections, async (request, response, next) => {
    try {
      const validation = validateRecord(request.body);
      if (!validation.valid) {
        throw new AppError(400, validation.field === 'quantity' ? ErrorCode.INVALID_QUANTITY : ErrorCode.INVALID_ACTIVITY_DATE, 'The activity record is invalid.', validation.details);
      }
      const goal = (request as AuthenticatedRequest).goal!;
      const rangeResult = await pool.query<{ min_value: number; max_value: number }>('SELECT min_value, max_value FROM activity_templates WHERE id = $1', [goal.template_id]);
      if (!rangeResult.rowCount) throw new AppError(404, ErrorCode.GOAL_NOT_FOUND, 'The goal was not found.');
      const range = rangeResult.rows[0];
      const quantityError = validateQuantityRange(validation.value.quantity, Number(range.min_value), Number(range.max_value));
      if (quantityError && !quantityError.valid) throw new AppError(400, ErrorCode.INVALID_QUANTITY, 'The activity quantity is outside the template range.', quantityError.details);
      const todayDate = clock.today(config.appTimezone);
      const earliestDate = computeEarliestDate(todayDate, MAX_BACKDATE_DAYS, config.appTimezone);
      if (
        validation.value.activity_date < goal.start_date ||
        validation.value.activity_date > goal.end_date ||
        validation.value.activity_date > todayDate ||
        validation.value.activity_date < earliestDate
      ) {
        throw new AppError(
          400,
          ErrorCode.INVALID_ACTIVITY_DATE,
          'The activity date is outside the permitted period.',
          { activity_date: 'Activity date must be within the goal period, cannot be in the future, and cannot be more than 7 days in the past.' }
        );
      }
      try {
        const inserted = await pool.query(`INSERT INTO daily_records (goal_id, activity_date, quantity) VALUES ($1, $2, $3) RETURNING ${recordColumns}`, [goal.id, validation.value.activity_date, validation.value.quantity]);
        response.status(201).json({ record: mapRecord(inserted.rows[0]) });
      } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
          throw new AppError(409, ErrorCode.DUPLICATE_DAILY_RECORD, 'A record already exists for this goal and date.');
        }
        throw error;
      }
    } catch (error) { next(error); }
  });

  router.get('/', ...protections, async (request, response, next) => {
    try {
      const goal = (request as AuthenticatedRequest).goal!;
      const records = await pool.query(`SELECT ${recordColumns} FROM daily_records WHERE goal_id = $1 ORDER BY activity_date ASC, created_at ASC`, [goal.id]);
      response.status(200).json({ records: records.rows.map(mapRecord) });
    } catch (error) { next(error); }
  });
  return router;
};
