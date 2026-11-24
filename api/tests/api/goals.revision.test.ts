import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

let pool: Pool;
const password = 'test-password';
let templateId: string;
let aliceGoalId: string;
let bobGoalId: string;

beforeEach(async () => {
  pool = await resetTestDatabase();
  const hash = await bcrypt.hash(password, 12);
  const users = await pool.query<{ id: string; email: string }>(
    `INSERT INTO users (email, password_hash, role) VALUES 
     ('pm1@example.com', $1, 'program_manager'), 
     ('alice@example.com', $1, 'participant'), 
     ('bob@example.com', $1, 'participant') 
     RETURNING id, email`,
    [hash]
  );
  const managerId = users.rows.find((row) => row.email === 'pm1@example.com')!.id;
  const templates = await pool.query<{ id: string; name: string }>(
    `INSERT INTO activity_templates (name, unit, min_value, max_value, is_active, created_by) 
     VALUES ('Study Time', 'minutes', 1, 720, true, $1) RETURNING id`,
    [managerId]
  );
  templateId = templates.rows[0].id;
  const aliceId = users.rows.find((row) => row.email === 'alice@example.com')!.id;
  const bobId = users.rows.find((row) => row.email === 'bob@example.com')!.id;

  aliceGoalId = (
    await pool.query<{ id: string }>(
      `INSERT INTO goals (participant_id, template_id, target, start_date, end_date, version) 
       VALUES ($1, $2, 100, '2026-11-01', '2026-11-30', 1) RETURNING id`,
      [aliceId, templateId]
    )
  ).rows[0].id;

  bobGoalId = (
    await pool.query<{ id: string }>(
      `INSERT INTO goals (participant_id, template_id, target, start_date, end_date, version) 
       VALUES ($1, $2, 50, '2026-11-01', '2026-11-30', 1) RETURNING id`,
      [bobId, templateId]
    )
  ).rows[0].id;
});

afterEach(async () => {
  if (pool) await pool.end();
});

const login = async (email: string) => {
  const agent = request.agent(createApp(pool));
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
};

describe('S2-F04-R: Goal revision and versioned lifecycle', () => {
  it('TEST-S2-01 / AC-S2-01: owner creates versioned revision, increments version, and retrieves revision history', async () => {
    const alice = await login('alice@example.com');
    const response = await alice
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 200, end_date: '2026-12-15' })
      .expect(201);

    expect(response.body.goal).toEqual(
      expect.objectContaining({
        id: aliceGoalId,
        target: 200,
        end_date: '2026-12-15',
        version: 2,
      })
    );
    expect(response.body.revision).toEqual(
      expect.objectContaining({
        goal_id: aliceGoalId,
        version_number: 2,
        target: 200,
        end_date: '2026-12-15',
      })
    );

    const historyResponse = await alice.get(`/api/goals/${aliceGoalId}/revisions`).expect(200);
    expect(historyResponse.body.revisions).toHaveLength(2);
    expect(historyResponse.body.revisions[0]).toEqual(
      expect.objectContaining({ version_number: 1, target: 100, end_date: '2026-11-30' })
    );
    expect(historyResponse.body.revisions[1]).toEqual(
      expect.objectContaining({ version_number: 2, target: 200, end_date: '2026-12-15' })
    );
  });

  it('TEST-S2-02b / AC-S2-02: accepts total-period target greater than template daily maximum (AD-18)', async () => {
    const alice = await login('alice@example.com');
    const response = await alice
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 5000, end_date: '2026-12-31' })
      .expect(201);

    expect(response.body.goal.target).toBe(5000);
  });

  it('TEST-S2-03 / AC-S2-03: rejects end_date earlier than start_date with 400 INVALID_GOAL', async () => {
    const alice = await login('alice@example.com');
    const response = await alice
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 200, end_date: '2026-10-31' })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_GOAL');
  });

  it('TEST-S2-04 / AC-S2-04: shortening end_date preserves all existing daily_records without modification or deletion', async () => {
    await pool.query(
      `INSERT INTO daily_records (goal_id, activity_date, quantity) VALUES
       ($1, '2026-11-05', 30),
       ($1, '2026-11-10', 40)`,
      [aliceGoalId]
    );

    const alice = await login('alice@example.com');
    await alice
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 150, end_date: '2026-11-20' })
      .expect(201);

    const records = await pool.query<{ activity_date: string; quantity: string }>(
      `SELECT to_char(activity_date, 'YYYY-MM-DD') AS activity_date, quantity FROM daily_records WHERE goal_id = $1 ORDER BY activity_date ASC`,
      [aliceGoalId]
    );
    expect(records.rows).toHaveLength(2);
    expect(records.rows[0]).toEqual({ activity_date: '2026-11-05', quantity: '30.00' });
    expect(records.rows[1]).toEqual({ activity_date: '2026-11-10', quantity: '40.00' });
  });

  it('TEST-S2-05a / AC-S2-05: Program Manager cannot revise participant goal and receives 403 ROLE_FORBIDDEN', async () => {
    const pm = await login('pm1@example.com');
    const response = await pm
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 200, end_date: '2026-12-15' })
      .expect(403);

    expect(response.body.error.code).toBe('ROLE_FORBIDDEN');
  });

  it('TEST-S2-05b / AC-S2-05: another Participant cannot revise someone else goal and receives 404 GOAL_NOT_FOUND', async () => {
    const bob = await login('bob@example.com');
    const response = await bob
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 200, end_date: '2026-12-15' })
      .expect(404);

    expect(response.body.error.code).toBe('GOAL_NOT_FOUND');
  });

  it('TEST-S2-05c / AC-S2-05: unauthenticated request receives 401 SESSION_REQUIRED', async () => {
    const response = await request(createApp(pool))
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 200, end_date: '2026-12-15' })
      .expect(401);

    expect(response.body.error.code).toBe('SESSION_REQUIRED');
  });

  it('TEST-S2-06 / AC-S2-06: revision shortening end_date before today maintains past records and history continuity', async () => {
    await pool.query(
      `INSERT INTO daily_records (goal_id, activity_date, quantity) VALUES ($1, '2026-11-02', 50)`,
      [aliceGoalId]
    );

    const alice = await login('alice@example.com');
    // Shorten end_date to 2026-11-03 (in the past relative to today 2026-11-24)
    const response = await alice
      .post(`/api/goals/${aliceGoalId}/revisions`)
      .send({ target: 80, end_date: '2026-11-03' })
      .expect(201);

    expect(response.body.goal.end_date).toBe('2026-11-03');

    // Existing record is still intact and retrievable via GET records
    const recordsResponse = await alice.get(`/api/goals/${aliceGoalId}/records`).expect(200);
    expect(recordsResponse.body.records).toHaveLength(1);
    expect(recordsResponse.body.records[0].activity_date).toBe('2026-11-02');
  });
});
