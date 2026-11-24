import type { NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';
import { AppError, ErrorCode } from '../errors.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { isUuid } from '../validators/goal.js';

export const requireOwnedGoal = (pool: Pool) => async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
  try {
    const id = request.params.id;
    if (!isUuid(id)) throw new AppError(400, ErrorCode.INVALID_GOAL_ID, 'Goal ID must be a valid UUID.');
    const user = (request as AuthenticatedRequest).user!;
    const result = await pool.query("SELECT id, participant_id, template_id, target, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date, COALESCE(version, 1) AS version FROM goals WHERE id = $1 AND participant_id = $2", [id, user.id]);
    if (!result.rowCount) throw new AppError(404, ErrorCode.GOAL_NOT_FOUND, 'The goal was not found.');
    (request as AuthenticatedRequest).goal = { ...result.rows[0], target: Number(result.rows[0].target), start_date: String(result.rows[0].start_date), end_date: String(result.rows[0].end_date), version: Number(result.rows[0].version ?? 1) };
    next();
  } catch (error) { next(error); }
};
