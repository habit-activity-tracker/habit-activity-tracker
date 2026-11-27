import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

let pool: Pool;
let aliceGoalId: string;
let bobGoalId: string;
const password = 'test-password';
const now = new Date('2026-11-25T01:30:00.000Z'); // 08:30 Asia/Bangkok
const clock = { today: () => '2026-11-25', now: () => now };
const app = () => createApp(pool, clock);

beforeEach(async () => {
  pool = await resetTestDatabase();
  const hash = await bcrypt.hash(password, 12);
  const users = await pool.query<{ id: string; email: string }>("INSERT INTO users(email,password_hash,role) VALUES ('pm@x.com',$1,'program_manager'),('alice@x.com',$1,'participant'),('bob@x.com',$1,'participant') RETURNING id,email", [hash]);
  const pm = users.rows.find((user) => user.email === 'pm@x.com')!.id;
  const alice = users.rows.find((user) => user.email === 'alice@x.com')!.id;
  const bob = users.rows.find((user) => user.email === 'bob@x.com')!.id;
  const template = await pool.query<{ id: string }>("INSERT INTO activity_templates(name,unit,min_value,max_value,is_active,created_by) VALUES ('Read','pages',1,1000,true,$1) RETURNING id", [pm]);
  aliceGoalId = (await pool.query<{ id: string }>("INSERT INTO goals(participant_id,template_id,target,start_date,end_date,version) VALUES($1,$2,100,'2026-11-01','2026-11-30',1) RETURNING id", [alice, template.rows[0].id])).rows[0].id;
  bobGoalId = (await pool.query<{ id: string }>("INSERT INTO goals(participant_id,template_id,target,start_date,end_date,version) VALUES($1,$2,100,'2026-11-01','2026-11-30',1) RETURNING id", [bob, template.rows[0].id])).rows[0].id;
});
afterEach(async () => { await pool.end(); });
const login = async (email: string) => { const agent = request.agent(app()); await agent.post('/api/auth/login').send({ email, password }).expect(200); return agent; };

describe('S3-F11-R reminder schedules', () => {
  it('TEST-S3-01: owner creates and reloads a normalized schedule with next occurrence', async () => {
    const alice = await login('alice@x.com');
    const created = await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send({ local_time: '08:30', days_of_week: [5, 1, 3] }).expect(201);
    expect(created.body.schedule).toEqual(expect.objectContaining({ goal_id: aliceGoalId, local_time: '08:30', days_of_week: [1, 3, 5], enabled: true, next_occurrence_at: '2026-11-27T01:30:00.000Z' }));
    const listed = await alice.get(`/api/goals/${aliceGoalId}/reminder-schedules`).expect(200);
    expect(listed.body.schedules).toHaveLength(1);
    expect(listed.body.schedules[0].id).toBe(created.body.schedule.id);
  });

  it('TEST-S3-03: rejects invalid payloads without persisting rows', async () => {
    const alice = await login('alice@x.com');
    for (const payload of [{ local_time: '24:00', days_of_week: [1] }, { local_time: '08:30', days_of_week: [1, 1] }, { local_time: '08:30:01', days_of_week: [1] }, { local_time: '08:30', days_of_week: [8] }, { local_time: '08:30', days_of_week: [1], enabled: 'yes' }, { local_time: '08:30', days_of_week: [1], extra: true }]) {
      const response = await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send(payload).expect(400);
      expect(response.body.error.code).toBe('INVALID_REMINDER_SCHEDULE');
    }
    expect((await alice.get(`/api/goals/${aliceGoalId}/reminder-schedules`)).body.schedules).toHaveLength(0);
  });

  it('TEST-S3-04: enforces three schedules including disabled rows', async () => {
    const alice = await login('alice@x.com');
    for (const day of [1, 2, 3]) await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send({ local_time: '08:30', days_of_week: [day], enabled: day !== 2 }).expect(201);
    const fourth = await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send({ local_time: '08:30', days_of_week: [4] }).expect(409);
    expect(fourth.body.error.code).toBe('REMINDER_SCHEDULE_LIMIT_REACHED');
  });

  it('TEST-S3-05: rejects ended goals and returns null after an existing goal ends', async () => {
    const alice = await login('alice@x.com');
    await pool.query("UPDATE goals SET end_date = '2026-11-24' WHERE id = $1", [aliceGoalId]);
    const ended = await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send({ local_time: '08:30', days_of_week: [1] }).expect(409);
    expect(ended.body.error.code).toBe('GOAL_ENDED');
    await pool.query("UPDATE goals SET end_date = '2026-11-30' WHERE id = $1", [aliceGoalId]);
    await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send({ local_time: '08:30', days_of_week: [1] }).expect(201);
    await pool.query("UPDATE goals SET end_date = '2026-11-24' WHERE id = $1", [aliceGoalId]);
    expect((await alice.get(`/api/goals/${aliceGoalId}/reminder-schedules`)).body.schedules[0].next_occurrence_at).toBeNull();
  });

  it('TEST-S3-07: uses strict future time and correct week rollover', async () => {
    const alice = await login('alice@x.com');
    await pool.query("UPDATE goals SET end_date = '2026-12-15' WHERE id = $1", [aliceGoalId]);
    const response = await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send({ local_time: '08:30', days_of_week: [3] }).expect(201);
    expect(response.body.schedule.next_occurrence_at).toBe('2026-12-02T01:30:00.000Z');
  });

  it('TEST-S3-08: preserves 401, 403, and 404 access order', async () => {
    await request(app()).get(`/api/goals/${aliceGoalId}/reminder-schedules`).expect(401);
    expect((await (await login('pm@x.com')).get(`/api/goals/${aliceGoalId}/reminder-schedules`)).body.error.code).toBe('ROLE_FORBIDDEN');
    const bob = await login('bob@x.com');
    const response = await bob.get(`/api/goals/${aliceGoalId}/reminder-schedules`).expect(404);
    expect(response.body.error.code).toBe('GOAL_NOT_FOUND');
    expect(response.body.error.details).toEqual({});
  });

  it('TEST-S3-09 / AC-S3-09: no notification dispatch occurs on create, list, or compute', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    try {
      const alice = await login('alice@x.com');
      await alice.post(`/api/goals/${aliceGoalId}/reminder-schedules`).send({ local_time: '08:30', days_of_week: [1] }).expect(201);
      await alice.get(`/api/goals/${aliceGoalId}/reminder-schedules`).expect(200);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
