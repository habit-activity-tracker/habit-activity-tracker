import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

let pool: Pool;
const password = 'test-password';
let templateId: string;
let inactiveTemplateId: string;
let bobGoalId: string;

beforeEach(async () => {
  pool = await resetTestDatabase();
  const hash = await bcrypt.hash(password, 12);
  const users = await pool.query<{ id: string; email: string }>(`INSERT INTO users (email, password_hash, role) VALUES ('pm1@example.com', $1, 'program_manager'), ('alice@example.com', $1, 'participant'), ('bob@example.com', $1, 'participant') RETURNING id, email`, [hash]);
  const managerId = users.rows.find((row) => row.email === 'pm1@example.com')!.id;
  const templates = await pool.query<{ id: string; name: string }>(`INSERT INTO activity_templates (name, unit, min_value, max_value, is_active, created_by) VALUES ('Study Time', 'minutes', 1, 720, true, $1), ('Meditation', 'minutes', 1, 120, false, $1) RETURNING id, name`, [managerId]);
  templateId = templates.rows.find((row) => row.name === 'Study Time')!.id;
  inactiveTemplateId = templates.rows.find((row) => row.name === 'Meditation')!.id;
  const bobId = users.rows.find((row) => row.email === 'bob@example.com')!.id;
  bobGoalId = (await pool.query<{ id: string }>('INSERT INTO goals (participant_id, template_id, target, start_date, end_date) VALUES ($1, $2, 20, CURRENT_DATE, CURRENT_DATE) RETURNING id', [bobId, templateId])).rows[0].id;
});

afterEach(async () => { if (pool) await pool.end(); });

const login = async (email: string) => {
  const agent = request.agent(createApp(pool));
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
};

describe('F-04 create personal goal', () => {
  it('TEST-04.1 / AC-04.1 creates a valid goal including one-day period', async () => {
    const agent = await login('alice@example.com');
    const response = await agent.post('/api/goals').send({ template_id: templateId, target: 30, start_date: '2026-11-04', end_date: '2026-11-04' });
    expect(response.status).toBe(201);
    expect(response.body.goal).toEqual(expect.objectContaining({ template_id: templateId, target: 30, start_date: '2026-11-04', end_date: '2026-11-04' }));
  });

  it('TEST-04.1 permits a total-period target above the one-day template maximum', async () => {
    const agent = await login('alice@example.com');
    const response = await agent.post('/api/goals').send({ template_id: templateId, target: 1000, start_date: '2026-11-04', end_date: '2026-11-04' });
    expect(response.status).toBe(201);
    expect(response.body.goal.target).toBe(1000);
  });

  it('TEST-04.2 / AC-04.2 rejects invalid target/date values', async () => {
    const agent = await login('alice@example.com');
    await agent.post('/api/goals').send({ template_id: templateId, target: 0, start_date: '2026-11-04', end_date: '2026-11-04' }).expect(400);
    await agent.post('/api/goals').send({ template_id: templateId, target: 10, start_date: '2026-11-05', end_date: '2026-11-04' }).expect(400);
  });

  it('TEST-04.7 / AC-04.2 rejects unknown and inactive templates', async () => {
    const agent = await login('alice@example.com');
    await agent.post('/api/goals').send({ template_id: inactiveTemplateId, target: 10, start_date: '2026-11-04', end_date: '2026-11-04' }).expect(404);
    await agent.post('/api/goals').send({ template_id: '00000000-0000-4000-8000-000000000099', target: 10, start_date: '2026-11-04', end_date: '2026-11-04' }).expect(404);
  });

  it('TEST-04.3 / AC-04.3 ignores a spoofed participantId and uses the session owner', async () => {
    const agent = await login('alice@example.com');
    const bobId = (await pool.query<{ id: string }>("SELECT id FROM users WHERE email = 'bob@example.com'")).rows[0].id;
    const response = await agent.post('/api/goals').send({ template_id: templateId, target: 10, start_date: '2026-11-04', end_date: '2026-11-04', participantId: bobId });
    expect(response.status).toBe(201);
    expect(response.body.goal.participant_id).not.toBe(bobId);
    expect((await pool.query('SELECT participant_id FROM goals WHERE id = $1', [response.body.goal.id])).rows[0].participant_id).toBe((await pool.query("SELECT id FROM users WHERE email = 'alice@example.com'")).rows[0].id);
  });

  it('TEST-04.4 / AC-04.4 lists only the current participant goals', async () => {
    const agent = await login('alice@example.com');
    const response = await agent.get('/api/goals').expect(200);
    expect(response.body.goals).toEqual([]);
  });

  it('TEST-04.5 / AC-04.5 rejects Program Manager goal creation', async () => {
    const agent = await login('pm1@example.com');
    await agent.post('/api/goals').send({ template_id: templateId, target: 10, start_date: '2026-11-04', end_date: '2026-11-04' }).expect(403);
  });

  it('TEST-04.6 / AC-04.6 hides another participant goal with 404', async () => {
    const agent = await login('alice@example.com');
    await agent.get(`/api/goals/${bobGoalId}`).expect(404);
  });

  it('TEST-04.8 rejects unauthenticated goal requests', async () => {
    await request(createApp(pool)).post('/api/goals').send({ template_id: templateId, target: 10, start_date: '2026-11-04', end_date: '2026-11-04' }).expect(401);
  });

  it('TEST-AC-43: goal PATCH and DELETE routes are explicitly absent', async () => {
    const agent = await login('alice@example.com');
    const patch = await agent.patch(`/api/goals/${bobGoalId}`).send({ target: 99 });
    const remove = await agent.delete(`/api/goals/${bobGoalId}`);

    expect(patch.status).toBe(404);
    expect(patch.body.error).toEqual({
      code: 'ROUTE_NOT_FOUND',
      message: expect.any(String),
      details: {},
    });
    expect(remove.status).toBe(404);
    expect(remove.body.error).toEqual({
      code: 'ROUTE_NOT_FOUND',
      message: expect.any(String),
      details: {},
    });
  });
});
