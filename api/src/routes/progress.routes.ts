import { Router } from 'express';
import type { Pool } from 'pg';
import type { AppConfig } from '../config/env.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireOwnedGoal } from '../middleware/goalOwnership.js';
import { AuthService } from '../services/auth.service.js';
import { calculateProgress } from '../services/progress.js';
import { calculateStreak } from '../services/streak.js';
import { systemClock, type Clock } from '../utils/clock.js';

export const createProgressRouter = (pool: Pool, config: AppConfig, clock: Clock = systemClock): Router => {
  const router = Router({ mergeParams: true });
  const auth = new AuthService(pool, config);
  router.get('/', requireAuth(auth), requireRole('participant'), requireOwnedGoal(pool), async (request, response, next) => {
    try {
      const goal = (request as AuthenticatedRequest).goal!;
      const result = await pool.query<{ quantity: number; activity_date: string }>("SELECT quantity, to_char(activity_date, 'YYYY-MM-DD') AS activity_date FROM daily_records WHERE goal_id = $1", [goal.id]);
      const progress = calculateProgress(goal.target, result.rows.map((row) => Number(row.quantity)));
      const today = clock.today(config.appTimezone);
      const streak = calculateStreak(result.rows.map((row) => row.activity_date), today, { startDate: goal.start_date, endDate: goal.end_date });
      response.json({ progress: { goal_id: goal.id, total_recorded: progress.totalRecorded, target: goal.target, percent: progress.percent, streak_days: streak } });
    } catch (error) { next(error); }
  });
  return router;
};
