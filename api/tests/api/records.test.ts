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

const addDays = (baseDate: string, days: number): string => {
  const date = new Date(`${baseDate}T12:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

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

  describe('TEST-12.1 / AC-12a 7-day backdating limit', () => {
    let longGoalId: string;

    beforeEach(async () => {
      const aliceId = (await pool.query<{ id: string }>("SELECT id FROM users WHERE email = 'alice@example.com'")).rows[0].id;
      longGoalId = (await pool.query<{ id: string }>(
        "INSERT INTO goals (participant_id, template_id, target, start_date, end_date) VALUES ($1, $2, 200, $3, $4) RETURNING id",
        [aliceId, templateId, addDays(today, -30), addDays(today, 10)]
      )).rows[0].id;
    });

    it('TEST-12.1a / AC-12a accepts record dated today (201) and it is retrievable', async () => {
      const alice = await login('alice@example.com');
      const response = await alice.post(`/api/goals/${longGoalId}/records`).send({ activity_date: today, quantity: 25 }).expect(201);
      expect(response.body.record).toEqual(expect.objectContaining({ goal_id: longGoalId, activity_date: today, quantity: 25 }));
      const listResponse = await alice.get(`/api/goals/${longGoalId}/records`).expect(200);
      expect(listResponse.body.records).toContainEqual(expect.objectContaining({ activity_date: today, quantity: 25 }));
    });

    it('TEST-12.1b / AC-12a accepts record dated today minus 7 days (201) and it is retrievable', async () => {
      const alice = await login('alice@example.com');
      const dateMinus7 = addDays(today, -7);
      const response = await alice.post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus7, quantity: 25 }).expect(201);
      expect(response.body.record).toEqual(expect.objectContaining({ goal_id: longGoalId, activity_date: dateMinus7, quantity: 25 }));
      const listResponse = await alice.get(`/api/goals/${longGoalId}/records`).expect(200);
      expect(listResponse.body.records).toContainEqual(expect.objectContaining({ activity_date: dateMinus7, quantity: 25 }));
    });

    it('TEST-12.1c / AC-12a rejects record dated today minus 8 days with 400 INVALID_ACTIVITY_DATE and stores no row', async () => {
      const alice = await login('alice@example.com');
      const dateMinus8 = addDays(today, -8);
      const response = await alice.post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus8, quantity: 25 }).expect(400);
      expect(response.body.error.code).toBe('INVALID_ACTIVITY_DATE');
      const rowCount = (await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM daily_records WHERE goal_id = $1 AND activity_date = $2', [longGoalId, dateMinus8])).rows[0].count;
      expect(Number(rowCount)).toBe(0);
    });

    it('TEST-12.1d / AC-11 rejects future date (today plus 1) with 400 INVALID_ACTIVITY_DATE', async () => {
      const alice = await login('alice@example.com');
      const tomorrow = addDays(today, 1);
      const response = await alice.post(`/api/goals/${longGoalId}/records`).send({ activity_date: tomorrow, quantity: 25 }).expect(400);
      expect(response.body.error.code).toBe('INVALID_ACTIVITY_DATE');
    });

    it('TEST-12.1e / AC-12 rejects date before goal start date even if within 7 days (regression)', async () => {
      const alice = await login('alice@example.com');
      const aliceId = (await pool.query<{ id: string }>("SELECT id FROM users WHERE email = 'alice@example.com'")).rows[0].id;
      const shortGoalId = (await pool.query<{ id: string }>(
        "INSERT INTO goals (participant_id, template_id, target, start_date, end_date) VALUES ($1, $2, 100, $3, $4) RETURNING id",
        [aliceId, templateId, addDays(today, -3), addDays(today, 5)]
      )).rows[0].id;
      const dateMinus4 = addDays(today, -4);
      const response = await alice.post(`/api/goals/${shortGoalId}/records`).send({ activity_date: dateMinus4, quantity: 25 }).expect(400);
      expect(response.body.error.code).toBe('INVALID_ACTIVITY_DATE');
    });

    it('TEST-12.1f / AC-14 duplicate record at today minus 7 returns 409 and preserves original quantity', async () => {
      const alice = await login('alice@example.com');
      const dateMinus7 = addDays(today, -7);
      await alice.post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus7, quantity: 25 }).expect(201);
      const duplicateResponse = await alice.post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus7, quantity: 50 }).expect(409);
      expect(duplicateResponse.body.error.code).toBe('DUPLICATE_DAILY_RECORD');
      const dbRows = (await pool.query<{ quantity: string }>('SELECT quantity FROM daily_records WHERE goal_id = $1 AND activity_date = $2', [longGoalId, dateMinus7])).rows;
      expect(dbRows).toHaveLength(1);
      expect(Number(dbRows[0].quantity)).toBe(25);
    });

    it('TEST-12.1g / AC-12a verifies Bangkok midnight boundary with injected clock', async () => {
      const injectedToday = '2026-11-20';
      const customApp = createApp(pool, { today: () => injectedToday });
      const alice = request.agent(customApp);
      await alice.post('/api/auth/login').send({ email: 'alice@example.com', password }).expect(200);

      const aliceId = (await pool.query<{ id: string }>("SELECT id FROM users WHERE email = 'alice@example.com'")).rows[0].id;
      const injectedGoalId = (await pool.query<{ id: string }>(
        "INSERT INTO goals (participant_id, template_id, target, start_date, end_date) VALUES ($1, $2, 100, '2026-11-01', '2026-11-30') RETURNING id",
        [aliceId, templateId]
      )).rows[0].id;

      // Minus 7 days from 2026-11-20 is 2026-11-13 (accepted, 201)
      await alice.post(`/api/goals/${injectedGoalId}/records`).send({ activity_date: '2026-11-13', quantity: 25 }).expect(201);

      // Minus 8 days from 2026-11-20 is 2026-11-12 (rejected, 400)
      const rejectedResponse = await alice.post(`/api/goals/${injectedGoalId}/records`).send({ activity_date: '2026-11-12', quantity: 25 }).expect(400);
      expect(rejectedResponse.body.error.code).toBe('INVALID_ACTIVITY_DATE');
    });

    it('TEST-12.1h / AC-09, AC-10 enforces role and ownership access control on older dates', async () => {
      const dateMinus5 = addDays(today, -5);
      const manager = await login('pm@example.com');
      await manager.post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus5, quantity: 25 }).expect(403);

      const bob = await login('bob@example.com');
      await bob.post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus5, quantity: 25 }).expect(404);

      await request(app()).post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus5, quantity: 25 }).expect(401);
    });

    it('TEST-12.1i / AC-12a rejects existing record at today minus 8 with 400 INVALID_ACTIVITY_DATE instead of 409', async () => {
      const alice = await login('alice@example.com');
      const dateMinus8 = addDays(today, -8);
      // Directly seed record at today - 8 into DB (simulating legacy data)
      await pool.query(
        'INSERT INTO daily_records (goal_id, activity_date, quantity) VALUES ($1, $2, 30)',
        [longGoalId, dateMinus8]
      );

      // Participant attempts to resubmit at today - 8; date rule precedes duplicate rule (400 before 409)
      const response = await alice.post(`/api/goals/${longGoalId}/records`).send({ activity_date: dateMinus8, quantity: 40 }).expect(400);
      expect(response.body.error.code).toBe('INVALID_ACTIVITY_DATE');
    });
  });
});
