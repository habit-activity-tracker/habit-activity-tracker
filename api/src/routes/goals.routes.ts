import { Router } from 'express';
import type { Pool } from 'pg';
import type { AppConfig } from '../config/env.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { AppError, ErrorCode } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireOwnedGoal } from '../middleware/goalOwnership.js';
import { AuthService } from '../services/auth.service.js';
import { isUuid, validateGoal, validateGoalRevision } from '../validators/goal.js';
import { calculateProgress } from '../services/progress.js';
import { calculateStreak } from '../services/streak.js';
import { systemClock, type Clock } from '../utils/clock.js';
import { validateReminder } from '../validators/reminder.js';
import { isoTimestamp, nextOccurrence } from '../services/reminders.js';

const goalColumns = "id, participant_id, template_id, target, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date, COALESCE(version, 1) AS version, created_at, updated_at";
const mapGoal = (row: Record<string, unknown>) => ({ ...row, target: Number(row.target), start_date: String(row.start_date), end_date: String(row.end_date), version: Number(row.version ?? 1) });

const revisionColumns = "id, goal_id, version_number, target, to_char(end_date, 'YYYY-MM-DD') AS end_date, to_char(effective_date, 'YYYY-MM-DD') AS effective_date, created_at";
const mapRevision = (row: Record<string, unknown>) => ({ ...row, version_number: Number(row.version_number), target: Number(row.target), end_date: String(row.end_date), effective_date: String(row.effective_date) });

export const createGoalsRouter = (pool: Pool, config: AppConfig, clock: Clock = systemClock): Router => {
  const router = Router();
  const authService = new AuthService(pool, config);
  router.post('/', requireAuth(authService), requireRole('participant'), async (request, response, next) => {
    try {
      const validation = validateGoal(request.body, config.appTimezone);
      if (!validation.valid) {
        const code = typeof request.body?.template_id === 'string' && !isUuid(request.body.template_id) ? ErrorCode.INVALID_GOAL_ID : ErrorCode.INVALID_GOAL;
        throw new AppError(400, code, 'The goal is invalid.', validation.details);
      }
      const template = await pool.query<{ id: string; is_active: boolean }>('SELECT id, is_active FROM activity_templates WHERE id = $1', [validation.value.template_id]);
      if (!template.rowCount || !template.rows[0].is_active) throw new AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, 'The activity template was not found.');
      const user = (request as AuthenticatedRequest).user!;
      const result = await pool.query(`INSERT INTO goals (participant_id, template_id, target, start_date, end_date, version) VALUES ($1, $2, $3, $4, $5, 1) RETURNING ${goalColumns}`, [user.id, validation.value.template_id, validation.value.target, validation.value.start_date, validation.value.end_date]);
      const createdGoal = result.rows[0];
      await pool.query(
        `INSERT INTO goal_revisions (goal_id, version_number, target, end_date, effective_date)
         VALUES ($1, 1, $2, $3, $4)
         ON CONFLICT (goal_id, version_number) DO NOTHING`,
        [createdGoal.id, validation.value.target, validation.value.end_date, validation.value.start_date]
      );
      response.status(201).json({ goal: mapGoal(createdGoal) });
    } catch (error) { next(error); }
  });
  router.get('/', requireAuth(authService), requireRole('participant'), async (request, response, next) => {
    try {
      const user = (request as AuthenticatedRequest).user!;
      const result = await pool.query(`SELECT ${goalColumns} FROM goals WHERE participant_id = $1 ORDER BY start_date ASC, created_at ASC`, [user.id]);
      response.status(200).json({ goals: result.rows.map(mapGoal) });
    } catch (error) { next(error); }
  });
  router.get('/:id', requireAuth(authService), requireRole('participant'), requireOwnedGoal(pool), (request, response) => {
    response.status(200).json({ goal: (request as AuthenticatedRequest).goal });
  });

  router.get('/:id/summary', requireAuth(authService), requireRole('participant'), requireOwnedGoal(pool), async (request, response, next) => {
    try {
      const goal = (request as AuthenticatedRequest).goal!;
      const recordsResult = await pool.query<{ id: string; activity_date: string; quantity: number; created_at: string }>("SELECT id, to_char(activity_date, 'YYYY-MM-DD') AS activity_date, quantity, created_at FROM daily_records WHERE goal_id = $1 ORDER BY activity_date ASC, created_at ASC", [goal.id]);
      const revisionsResult = await pool.query(`SELECT ${revisionColumns} FROM goal_revisions WHERE goal_id = $1 ORDER BY version_number ASC`, [goal.id]);
      const records = recordsResult.rows.map((row) => ({ ...row, quantity: Number(row.quantity), activity_date: String(row.activity_date) }));
      const progress = calculateProgress(goal.target, records.map((record) => record.quantity));
      const today = clock.today(config.appTimezone);
      const streak = calculateStreak(records.map((record) => record.activity_date), today, { startDate: goal.start_date, endDate: goal.end_date });
      const revisions = revisionsResult.rows.length ? revisionsResult.rows.map(mapRevision) : [{
        id: null, goal_id: goal.id, version_number: 1, target: goal.target, end_date: goal.end_date, effective_date: goal.start_date, created_at: null,
      }];
      response.status(200).json({
        goal,
        summary: { total_recorded: progress.totalRecorded, percent: progress.percent, streak_days: streak },
        records,
        revisions,
      });
    } catch (error) { next(error); }
  });

  const reminderColumns = "id, goal_id, to_char(local_time, 'HH24:MI') AS local_time, days_of_week, enabled, created_at, updated_at";
  const mapReminder = (row: Record<string, unknown>, goalEndDate: string) => {
    const schedule = { id: String(row.id), goal_id: String(row.goal_id), local_time: String(row.local_time), days_of_week: (row.days_of_week as number[]).map(Number), enabled: Boolean(row.enabled), created_at: isoTimestamp(row.created_at), updated_at: isoTimestamp(row.updated_at) };
    return { ...schedule, next_occurrence_at: nextOccurrence(schedule, goalEndDate, clock, config.appTimezone) };
  };
  router.post('/:id/reminder-schedules', requireAuth(authService), requireRole('participant'), requireOwnedGoal(pool), async (request, response, next) => {
    try {
      const goal = (request as AuthenticatedRequest).goal!;
      const validation = validateReminder(request.body);
      if (!validation.valid) throw new AppError(400, ErrorCode.INVALID_REMINDER_SCHEDULE, 'The reminder schedule is invalid.', validation.details);
      const today = clock.today(config.appTimezone);
      if (goal.end_date < today) throw new AppError(409, ErrorCode.GOAL_ENDED, 'The goal has already ended.');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT id FROM goals WHERE id = $1 FOR UPDATE', [goal.id]);
        const count = await client.query('SELECT COUNT(*)::int AS count FROM reminder_schedules WHERE goal_id = $1', [goal.id]);
        if (count.rows[0].count >= 3) throw new AppError(409, ErrorCode.REMINDER_SCHEDULE_LIMIT_REACHED, 'The goal already has three reminder schedules.');
        const result = await client.query(`INSERT INTO reminder_schedules (goal_id, local_time, days_of_week, enabled) VALUES ($1, $2, $3, $4) RETURNING ${reminderColumns}`, [goal.id, validation.value.local_time, validation.value.days_of_week, validation.value.enabled]);
        await client.query('COMMIT');
        response.status(201).json({ schedule: mapReminder(result.rows[0], goal.end_date) });
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    } catch (error) { next(error); }
  });
  router.get('/:id/reminder-schedules', requireAuth(authService), requireRole('participant'), requireOwnedGoal(pool), async (request, response, next) => {
    try {
      const goal = (request as AuthenticatedRequest).goal!;
      const result = await pool.query(`SELECT ${reminderColumns} FROM reminder_schedules WHERE goal_id = $1 ORDER BY created_at ASC, id ASC`, [goal.id]);
      response.status(200).json({ schedules: result.rows.map((row) => mapReminder(row, goal.end_date)) });
    } catch (error) { next(error); }
  });

  router.post('/:id/revisions', requireAuth(authService), requireRole('participant'), requireOwnedGoal(pool), async (request, response, next) => {
    try {
      const goal = (request as AuthenticatedRequest).goal!;
      const validation = validateGoalRevision(request.body, goal.start_date);
      if (!validation.valid) {
        throw new AppError(400, ErrorCode.INVALID_GOAL, 'The goal revision is invalid.', validation.details);
      }
      const currentVersion = Number(goal.version ?? 1);
      const nextVersion = currentVersion + 1;
      const effectiveDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: config.appTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const v1Exists = await client.query('SELECT 1 FROM goal_revisions WHERE goal_id = $1 AND version_number = 1', [goal.id]);
        if (!v1Exists.rowCount) {
          await client.query(
            `INSERT INTO goal_revisions (goal_id, version_number, target, end_date, effective_date)
             VALUES ($1, 1, $2, $3, $4)
             ON CONFLICT (goal_id, version_number) DO NOTHING`,
            [goal.id, goal.target, goal.end_date, goal.start_date]
          );
        }
        const revisionResult = await client.query(
          `INSERT INTO goal_revisions (goal_id, version_number, target, end_date, effective_date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING ${revisionColumns}`,
          [goal.id, nextVersion, validation.value.target, validation.value.end_date, effectiveDate]
        );
        const updatedGoal = await client.query(
          `UPDATE goals
           SET target = $1, end_date = $2, version = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING ${goalColumns}`,
          [validation.value.target, validation.value.end_date, nextVersion, goal.id]
        );
        await client.query('COMMIT');
        response.status(201).json({
          goal: mapGoal(updatedGoal.rows[0]),
          revision: mapRevision(revisionResult.rows[0]),
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) { next(error); }
  });

  router.get('/:id/revisions', requireAuth(authService), requireRole('participant'), requireOwnedGoal(pool), async (request, response, next) => {
    try {
      const goal = (request as AuthenticatedRequest).goal!;
      const v1Exists = await pool.query('SELECT 1 FROM goal_revisions WHERE goal_id = $1 AND version_number = 1', [goal.id]);
      if (!v1Exists.rowCount) {
        await pool.query(
          `INSERT INTO goal_revisions (goal_id, version_number, target, end_date, effective_date)
           VALUES ($1, 1, $2, $3, $4)
           ON CONFLICT (goal_id, version_number) DO NOTHING`,
          [goal.id, goal.target, goal.end_date, goal.start_date]
        );
      }
      const result = await pool.query(
        `SELECT ${revisionColumns} FROM goal_revisions WHERE goal_id = $1 ORDER BY version_number ASC`,
        [goal.id]
      );
      response.status(200).json({ revisions: result.rows.map(mapRevision) });
    } catch (error) { next(error); }
  });
  return router;
};
