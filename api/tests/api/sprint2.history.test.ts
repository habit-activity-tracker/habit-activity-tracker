import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

let pool: Pool;
let ownerGoalId: string;
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
  ownerGoalId = (await pool.query<{ id: string }>("INSERT INTO goals(participant_id,template_id,target,start_date,end_date,version) VALUES($1,$2,100,'2026-11-01','2026-11-30',1) RETURNING id", [alice, template.rows[0].id])).rows[0].id;
  await pool.query("INSERT INTO goal_revisions(goal_id,version_number,target,end_date,effective_date) VALUES($1,1,100,'2026-11-30','2026-11-01')", [ownerGoalId]);
  await pool.query("INSERT INTO daily_records(goal_id,activity_date,quantity) VALUES($1,'2026-11-22',25),($1,'2026-11-23',25)", [ownerGoalId]);
});

afterEach(async () => { await pool.end(); });

const login = async (email: string) => {
  const agent = request.agent(app());
  await agent.post('/api/auth/login').send({ email, password }).expect(200);
  return agent;
};

describe('S2-F06-S and S2-F07-S progress/history summary', () => {
  it('returns the deterministic yesterday-ending streak and owner summary', async () => {
    const owner = await login('alice@x.com');
    const progress = await owner.get(`/api/goals/${ownerGoalId}/progress`).expect(200);
    expect(progress.body.progress).toMatchObject({ total_recorded: 50, percent: 50, streak_days: 2 });

    const summary = await owner.get(`/api/goals/${ownerGoalId}/summary`).expect(200);
    expect(summary.body.summary).toMatchObject({ total_recorded: 50, percent: 50, streak_days: 2 });
    expect(summary.body.records.map((record: { activity_date: string }) => record.activity_date)).toEqual(['2026-11-22', '2026-11-23']);
    expect(summary.body.revisions).toHaveLength(1);
  });

  it('preserves privacy and access-check order for the summary', async () => {
    await request(app()).get(`/api/goals/${ownerGoalId}/summary`).expect(401);
    await (await login('pm@x.com')).get(`/api/goals/${ownerGoalId}/summary`).expect(403);
    await (await login('bob@x.com')).get(`/api/goals/${ownerGoalId}/summary`).expect(404);
  });
});
