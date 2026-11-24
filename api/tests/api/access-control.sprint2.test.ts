import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

let pool: Pool;
let aliceGoalId: string;
const password = 'test-password';
const today = '2026-11-24';
const app = () => createApp(pool, { today: () => today });

beforeEach(async () => {
  pool = await resetTestDatabase();
  const hash = await bcrypt.hash(password, 12);
  const users = await pool.query<{ id: string; email: string }>("INSERT INTO users(email,password_hash,role) VALUES ('pm@x.com',$1,'program_manager'),('alice@x.com',$1,'participant'),('bob@x.com',$1,'participant') RETURNING id,email", [hash]);
  const pm = users.rows.find((user) => user.email === 'pm@x.com')!.id;
  const alice = users.rows.find((user) => user.email === 'alice@x.com')!.id;
  const template = await pool.query<{ id: string }>("INSERT INTO activity_templates(name,unit,min_value,max_value,is_active,created_by) VALUES ('Read','pages',0,1000,true,$1) RETURNING id", [pm]);
  aliceGoalId = (await pool.query<{ id: string }>("INSERT INTO goals(participant_id,template_id,target,start_date,end_date,version) VALUES($1,$2,100,'2026-11-01','2026-11-30',1) RETURNING id", [alice, template.rows[0].id])).rows[0].id;
  await pool.query("INSERT INTO goal_revisions(goal_id,version_number,target,end_date,effective_date) VALUES($1,1,100,'2026-11-30','2026-11-01')", [aliceGoalId]);
});

afterEach(async () => { await pool.end(); });

const login = async (email: string) => {
  const agent = request.agent(app());
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
};

const protectedReads = [
  `/api/goals/${'GOAL_ID'}/progress`,
  `/api/goals/${'GOAL_ID'}/summary`,
  `/api/goals/${'GOAL_ID'}/revisions`,
];

describe('Issue 7 Sprint 2 access-control matrix', () => {
  it('requires a session before checking role, ownership, or payload', async () => {
    const agent = request(app());
    for (const path of protectedReads) await agent.get(path.replace('GOAL_ID', aliceGoalId)).expect(401);
    await agent.post(`/api/goals/${aliceGoalId}/revisions`).send({ target: 200, end_date: '2026-12-01' }).expect(401);
  });

  it('denies a Program Manager with 403 on every available protected Sprint 2 endpoint', async () => {
    const manager = await login('pm@x.com');
    for (const path of protectedReads) await manager.get(path.replace('GOAL_ID', aliceGoalId)).expect(403);
    await manager.post(`/api/goals/${aliceGoalId}/revisions`).send({ target: 200, end_date: '2026-12-01' }).expect(403);
  });

  it('hides Alice data from another Participant with privacy-safe 404', async () => {
    const bob = await login('bob@x.com');
    for (const path of protectedReads) await bob.get(path.replace('GOAL_ID', aliceGoalId)).expect(404);
    await bob.post(`/api/goals/${aliceGoalId}/revisions`).send({ target: 200, end_date: '2026-12-01' }).expect(404);
  });

  it('allows the owner to use the protected Sprint 2 endpoints', async () => {
    const alice = await login('alice@x.com');
    await alice.get(`/api/goals/${aliceGoalId}/progress`).expect(200);
    await alice.get(`/api/goals/${aliceGoalId}/summary`).expect(200);
    await alice.get(`/api/goals/${aliceGoalId}/revisions`).expect(200);
    await alice.post(`/api/goals/${aliceGoalId}/revisions`).send({ target: 200, end_date: '2026-12-01' }).expect(201);
  });
});
