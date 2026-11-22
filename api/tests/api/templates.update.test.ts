import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

let pool: Pool;
const password = 'test-password';
const login = async (email: string) => { const agent = request.agent(createApp(pool)); await agent.post('/api/auth/login').send({ email, password }).expect(200); return agent; };

beforeEach(async () => {
  pool = await resetTestDatabase();
  const hash = await bcrypt.hash(password, 12);
  const users = await pool.query(`INSERT INTO users (email, password_hash, role) VALUES ('pm@example.com', $1, 'program_manager'), ('participant@example.com', $1, 'participant') RETURNING id`, [hash]);
  await pool.query(`INSERT INTO activity_templates (name, description, unit, min_value, max_value, is_active, created_by) VALUES ('Study Time', 'Initial description', 'minutes', 1, 720, true, $1)`, [users.rows[0].id]);
});
afterEach(async () => { if (pool) await pool.end(); });

const template = async () => (await pool.query<{ id: string; unit: string; updated_at: string }>('SELECT id, unit, updated_at FROM activity_templates LIMIT 1')).rows[0];

describe('F-11 template editing', () => {
  it('TEST-17 / S1-09 TEST-11.1 / AC-17 manager updates metadata and updated_at', async () => {
    const before = await template();
    const response = await (await login('pm@example.com')).patch(`/api/activity-templates/${before.id}`).send({ name: 'Focused Study', description: 'Updated', min_value: 2, max_value: 600 }).expect(200);
    expect(response.body.template).toEqual(expect.objectContaining({ name: 'Focused Study', min_value: 2, max_value: 600, unit: 'minutes' }));
    expect(new Date(response.body.template.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(before.updated_at).getTime());
  });
  it('TEST-18 / S1-09 TEST-11.2 / AC-18 participant gets 403 and template is unchanged', async () => {
    const before = await template();
    await (await login('participant@example.com')).patch(`/api/activity-templates/${before.id}`).send({ name: 'Not allowed' }).expect(403);
    expect((await pool.query('SELECT name FROM activity_templates WHERE id = $1', [before.id])).rows[0].name).toBe('Study Time');
  });
  it('TEST-19 / S1-09 TEST-11.3 / AC-19 rejects unit and preserves the stored unit', async () => {
    const id = (await template()).id; const agent = await login('pm@example.com');
    await agent.patch(`/api/activity-templates/${id}`).send({ unit: 'pages' }).expect(400).expect((r) => expect(r.body.error.code).toBe('UNIT_IMMUTABLE'));
    await agent.patch(`/api/activity-templates/${id}`).send({ unit: 'pages' }).expect(400);
    expect((await pool.query('SELECT unit FROM activity_templates WHERE id = $1', [id])).rows[0].unit).toBe('minutes');
  });
  it('TEST-20 / S1-09 TEST-11.4 / AC-20 rejects empty, unknown and invalid updates', async () => {
    const id = (await template()).id; const agent = await login('pm@example.com');
    await agent.patch(`/api/activity-templates/${id}`).send({}).expect(400);
    await agent.patch(`/api/activity-templates/${id}`).send({ unknown: true }).expect(400);
    await agent.patch(`/api/activity-templates/${id}`).send({ min_value: 5, max_value: 2 }).expect(400);
  });
  it('TEST-21 / S1-09 TEST-11.5 / AC-21 range update leaves existing records intact', async () => {
    const id = (await template()).id; const participant = await login('participant@example.com');
    const goal = await participant.post('/api/goals').send({ template_id: id, target: 10, start_date: '2026-11-01', end_date: '2026-11-01' }).expect(201);
    await participant.post(`/api/goals/${goal.body.goal.id}/records`).send({ quantity: 5, activity_date: '2026-11-01' }).expect(201);
    await (await login('pm@example.com')).patch(`/api/activity-templates/${id}`).send({ min_value: 2, max_value: 100 }).expect(200);
    const records = await participant.get(`/api/goals/${goal.body.goal.id}/records`).expect(200);
    expect(records.body.records).toHaveLength(1);
  });
  it('TEST-22 / S1-09 TEST-11.6 / AC-22 unknown template is not disclosed and unauthenticated gets 401', async () => {
    const id = (await template()).id;
    await request(createApp(pool)).patch(`/api/activity-templates/${id}`).send({ name: 'No session' }).expect(401);
    await (await login('pm@example.com')).patch('/api/activity-templates/00000000-0000-4000-8000-000000000000').send({ name: 'Missing' }).expect(404);
  });
});
