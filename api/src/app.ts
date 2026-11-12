import cookieParser from 'cookie-parser';
import express, { Express } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { loadConfig } from './config/env.js';
import { getPool } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createAuthRouter, createCurrentUserRouter } from './routes/auth.routes.js';
import { createTemplatesRouter } from './routes/templates.routes.js';
import { createGoalsRouter } from './routes/goals.routes.js';
import { createRecordsRouter } from './routes/records.routes.js';
import { createProgressRouter } from './routes/progress.routes.js';
import { systemClock, type Clock } from './utils/clock.js';

export const createApp = (pool: Pool = getPool(), clock: Clock = systemClock): Express => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.get('/api/ready', async (_request, response) => {
    try {
      await pool.query('SELECT 1');
      response.status(200).json({ status: 'ready' });
    } catch {
      response.status(503).json({ status: 'not_ready' });
    }
  });

  app.use('/api/auth', createAuthRouter(pool, loadConfig()));
  app.use('/api', createCurrentUserRouter(pool, loadConfig()));
  const templatesRouter = createTemplatesRouter(pool, loadConfig());
  app.use('/api/activity-templates', templatesRouter);
  app.use('/api/templates', templatesRouter);
  const goalsRouter = createGoalsRouter(pool, loadConfig());
  app.use('/api/goals', goalsRouter);
  app.use('/api/goals/:id/records', createRecordsRouter(pool, loadConfig(), clock));
  app.use('/api/goals/:id/progress', createProgressRouter(pool, loadConfig()));

  // Docker supplies the compiled React bundle here. Keeping this opt-in means
  // API tests and local Vite development continue to use their usual setup.
  const webDistDir = process.env.WEB_DIST_DIR;
  if (webDistDir && existsSync(webDistDir)) {
    app.use(express.static(resolve(webDistDir)));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.path === '/api' || request.path.startsWith('/api/')) {
        next();
        return;
      }
      response.sendFile('index.html', { root: resolve(webDistDir) });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
