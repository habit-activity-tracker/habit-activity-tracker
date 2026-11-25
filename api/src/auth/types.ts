import type { Request } from 'express';

export type UserRole = 'program_manager' | 'participant';

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  sessionId?: string;
  goal?: { id: string; participant_id: string; template_id: string; target: number; start_date: string; end_date: string; version?: number };
}
