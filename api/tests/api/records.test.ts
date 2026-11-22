import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

let pool: Pool;
let templateId: string;
let aliceGoalId: string;
let bobGoalId: string;
const password = 'test-password';
const today = '2026-11-04';
const app = () => createApp(pool, { today: () => today });

beforeEach(async () => {
  pool = await resetTestDatabase();
  const hash = await bcrypt.hash(password, 12);
  const users = await pool.query<{ id: string; email: string }>(
    "INSERT INTO users (email, password_hash, role) VALUES ('pm@example.com', $1, 'program_manager'), ('alice@example.com', $1, 'participant'), ('bob@example.com', $1, 'participant') RETURNING id, email",
    [hash]
  );
  const managerId = users.rows.find((user) => user.email === 'pm@example.com')!.id;
  const aliceId = users.rows.find((user) => user.email === 'alice@example.com')!.id;
  const bobId = users.rows.find((user) => user.email === 'bob@example.com')!.id;
  templateId = (await pool.query<{ id: string }>("INSERT INTO activity_templates (name, unit, min_value, max_value, is_active, created_by) VALUES ('Steps', 'steps', 0, 500, true, $1) RETURNING id", [managerId])).rows[0].id;
  aliceGoalId = (await pool.query<{ id: string }>("INSERT INTO goals (participant_id, template_id, target, start_date, end_date) VALUES ($1, $2, 100, '2026-11-01', '2026-11-05') RETURNING id", [aliceId, templateId])).rows[0].id;
  bobGoalId = (await pool.query<{ id: string }>("INSERT INTO goals (participant_id, template_id, target, start_date, end_date) VALUES ($1, $2, 100, '2026-11-01', '2026-11-05') RETURNING id", [bobId, templateId])).rows[0].id;
});

afterEach(async () => { await pool.end(); });

const login = async (email: string) => {
  const agent = request.agent(app());
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
};

describe('F-05 record daily activity', () => {
  it('TEST-05.1 / AC-05.1 saves a valid record', async () => {
    const alice = await login('alice@example.com');
    const response = await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(201);
    expect(response.body.record).toEqual(expect.objectContaining({ goal_id: aliceGoalId, activity_date: today, quantity: 25 }));
  });

  it('TEST-05.2 / AC-05.2 accepts inclusive bounds and rejects outside/non-numeric values', async () => {
    const alice = await login('alice@example.com');
    await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: '2026-11-01', quantity: 0 }).expect(201);
    await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: '2026-11-02', quantity: 500 }).expect(201);
    for (const [activity_date, quantity] of [['2026-11-03', -0.01], ['2026-11-04', 500.01], ['2026-11-05', '25']] as const) {
      const response = await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date, quantity }).expect(400);
      expect(response.body.error.code).toBe('INVALID_QUANTITY');
    }
  });

  it('TEST-05.3 and TEST-05.7 / AC-05.3, AC-05.7 reject dates outside the goal period and future dates', async () => {
    const alice = await login('alice@example.com');
    for (const activity_date of ['2026-10-31', '2026-11-06']) {
      const response = await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date, quantity: 25 }).expect(400);
      expect(response.body.error.code).toBe('INVALID_ACTIVITY_DATE');
    }
  });

  it('TEST-05.4 / AC-05.4 maps duplicate records to 409 and database rejects a direct duplicate', async () => {
    const alice = await login('alice@example.com');
    await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(201);
    await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 50 }).expect(409);
    await expect(pool.query('INSERT INTO daily_records (goal_id, activity_date, quantity) VALUES ($1, $2, $3)', [aliceGoalId, today, 75])).rejects.toMatchObject({ code: '23505' });
    expect((await pool.query('SELECT quantity FROM daily_records WHERE goal_id = $1', [aliceGoalId])).rows).toEqual([{ quantity: '25.00' }]);
  });

  it('TEST-05.4 handles simultaneous duplicate requests as one 201 and one 409', async () => {
    const alice = await login('alice@example.com');
    const responses = await Promise.all([1, 2].map(() => alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 25 })));
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  });

  it('TEST-05.5 / AC-05.5 hides another participant goal', async () => {
    const alice = await login('alice@example.com');
    await alice.post(`/api/goals/${bobGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(404);
  });

  it('TEST-05.6 / AC-05.6 retrieves saved records for its goal', async () => {
    const alice = await login('alice@example.com');
    await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(201);
    const response = await alice.get(`/api/goals/${aliceGoalId}/records`).expect(200);
    expect(response.body.records).toEqual([expect.objectContaining({ activity_date: today, quantity: 25 })]);
  });

  it('TEST-05.8 / AC-05.8 rejects Program Manager requests after authentication', async () => {
    const manager = await login('pm@example.com');
    await manager.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(403);
  });

  it('requires an authenticated session before all other checks', async () => {
    await request(app()).post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(401);
  });

  it('allows records on distinct goals with the same template and date', async () => {
    const alice = await login('alice@example.com');
    const aliceId = (await pool.query<{ id: string }>("SELECT id FROM users WHERE email = 'alice@example.com'")).rows[0].id;
    const secondGoal = (await pool.query<{ id: string }>("INSERT INTO goals (participant_id, template_id, target, start_date, end_date) VALUES ($1, $2, 100, '2026-11-01', '2026-11-05') RETURNING id", [aliceId, templateId])).rows[0].id;
    await alice.post(`/api/goals/${aliceGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(201);
    await alice.post(`/api/goals/${secondGoal}/records`).send({ activity_date: today, quantity: 25 }).expect(201);
  });
});
