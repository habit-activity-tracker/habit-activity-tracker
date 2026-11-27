export type ErrorDetails = Record<string, unknown>;

export const ErrorCode = {
  // 400
  INVALID_LOGIN_REQUEST: 'INVALID_LOGIN_REQUEST',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_TEMPLATE: 'INVALID_TEMPLATE',
  INVALID_TEMPLATE_UPDATE: 'INVALID_TEMPLATE_UPDATE',
  UNIT_IMMUTABLE: 'UNIT_IMMUTABLE',
  INVALID_GOAL: 'INVALID_GOAL',
  INVALID_GOAL_ID: 'INVALID_GOAL_ID',
  INVALID_ACTIVITY_DATE: 'INVALID_ACTIVITY_DATE',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_REMINDER_SCHEDULE: 'INVALID_REMINDER_SCHEDULE',

  // 401
  SESSION_REQUIRED: 'SESSION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 403
  ROLE_FORBIDDEN: 'ROLE_FORBIDDEN',

  // 404
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',

  // 409
  DUPLICATE_DAILY_RECORD: 'DUPLICATE_DAILY_RECORD',
  TEMPLATE_UPDATE_CONFLICT: 'TEMPLATE_UPDATE_CONFLICT',
  GOAL_ENDED: 'GOAL_ENDED',
  REMINDER_SCHEDULE_LIMIT_REACHED: 'REMINDER_SCHEDULE_LIMIT_REACHED',

  // 500
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ErrorDetails = {}
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const routeNotFound = () =>
  new AppError(404, ErrorCode.ROUTE_NOT_FOUND, 'The requested route was not found.');

export const internalError = () =>
  new AppError(500, ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred.');
