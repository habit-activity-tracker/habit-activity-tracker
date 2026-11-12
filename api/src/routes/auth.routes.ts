import { Router } from 'express';
import type { Pool } from 'pg';
import type { AuthenticatedRequest } from '../auth/types.js';
import type { AppConfig } from '../config/env.js';
import { AppError, ErrorCode } from '../errors.js';
import { requireAuth, sessionCookieName } from '../middleware/auth.js';
import { AuthService } from '../services/auth.service.js';

const secureCookies = (config: AppConfig): boolean =>
  process.env.SESSION_COOKIE_SECURE === 'true' ||
  (process.env.SESSION_COOKIE_SECURE !== 'false' && (process.env.NODE_ENV === 'production' || config.appEnv === 'production'));

const safeCookieOptions = (config: AppConfig, maxAge?: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: secureCookies(config),
  ...(maxAge === undefined ? {} : { maxAge }),
});

export const createAuthRouter = (pool: Pool, config: AppConfig): Router => {
  const router = Router();
  const authService = new AuthService(pool, config);

  router.post('/login', async (request, response, next) => {
    try {
      const { email, password } = request.body ?? {};
      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        throw new AppError(400, ErrorCode.INVALID_LOGIN_REQUEST, 'Email and password are required.');
      }
      const result = await authService.login(email, password);
      response.cookie(sessionCookieName, result.token, safeCookieOptions(config, result.maxAgeMs));
      response.status(200).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAuth(authService), (request, response) => {
    response.status(200).json({ user: (request as AuthenticatedRequest).user });
  });

  router.post('/logout', requireAuth(authService), async (request, response, next) => {
    try {
      const sessionId = (request as AuthenticatedRequest).sessionId;
      if (sessionId) await authService.logout(sessionId);
      response.clearCookie(sessionCookieName, safeCookieOptions(config));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};

export const createCurrentUserRouter = (pool: Pool, config: AppConfig): Router => {
  const router = Router();
  const authService = new AuthService(pool, config);
  router.get('/me', requireAuth(authService), (request, response) => {
    response.status(200).json({ user: (request as AuthenticatedRequest).user });
  });
  return router;
};
