import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';
describe('SMOKE-1 unknown route', () => { it('returns the standard 404 error response', async () => { const response = await request(createApp()).get('/not-a-route'); expect(response.status).toBe(404); expect(response.body).toEqual({ error: { code: 'ROUTE_NOT_FOUND', message: 'The requested route was not found.', details: {} } }); }); });
describe('SMOKE-2 deployment version', () => {
  it('reports the configured commit SHA through the health endpoint', async () => {
    const previousCommit = process.env.GIT_COMMIT_SHA;
    process.env.GIT_COMMIT_SHA = '0123456789abcdef0123456789abcdef01234567';
    try {
      const response = await request(createApp()).get('/api/health').expect(200);
      expect(response.body).toEqual({
        status: 'ok',
        commit: '0123456789abcdef0123456789abcdef01234567',
      });
    } finally {
      if (previousCommit === undefined) delete process.env.GIT_COMMIT_SHA;
      else process.env.GIT_COMMIT_SHA = previousCommit;
    }
  });
});
describe('SMOKE-3 database reset and migration', () => { it('migrates an empty independent test database', async () => { const pool = await resetTestDatabase(); try { expect((await pool.query('SELECT name FROM schema_migrations ORDER BY name')).rows).toEqual([{ name: '001-initialize.sql' }, { name: '002-users-and-sessions.sql' }, { name: '003_activity_templates.sql' }, { name: '004-goals.sql' }, { name: '005-daily-records.sql' }, { name: '006-goal-revisions.sql' }, { name: '007-reminder-schedules.sql' }]); } finally { await pool.end(); } }); });
