import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const benchmarkSeedModule = new URL('../../../scripts/benchmark-seed.ts', import.meta.url).href;

const seedBenchmarkRecords = async (targetCount: number): Promise<void> => {
  await execFileAsync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      `import { runBenchmarkSeed } from '${benchmarkSeedModule}'; await runBenchmarkSeed(${targetCount});`,
    ],
    { cwd: repositoryRoot, env: process.env }
  );
};

describe('S2-F10-P: Performance evidence and benchmark harness', () => {
  let pool: Pool;
  const password = 'test-password';
  let goalId: string;

  beforeEach(async () => {
    pool = await resetTestDatabase();
    const hash = await bcrypt.hash(password, 10);
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role) VALUES ('bench_user@example.com', $1, 'participant') RETURNING id`,
      [hash]
    );
    const pmRes = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role) VALUES ('bench_pm@example.com', $1, 'program_manager') RETURNING id`,
      [hash]
    );
    const tplRes = await pool.query<{ id: string }>(
      `INSERT INTO activity_templates (name, unit, min_value, max_value, is_active, created_by)
       VALUES ('Bench Metric', 'units', 1, 1000, true, $1) RETURNING id`,
      [pmRes.rows[0].id]
    );
    const goalRes = await pool.query<{ id: string }>(
      `INSERT INTO goals (participant_id, template_id, target, start_date, end_date)
       VALUES ($1, $2, 10000, '2026-01-01', '2026-12-31') RETURNING id`,
      [userRes.rows[0].id, tplRes.rows[0].id]
    );
    goalId = goalRes.rows[0].id;
  });

  afterEach(async () => {
    if (pool) await pool.end();
  });

  it('TEST-S2-15 / AC-S2-15: batch inserts valid daily records without unique constraint conflict', async () => {
    // Insert 500 records in batches into test DB
    const records = Array.from({ length: 500 }, (_, i) => {
      const d = new Date(new Date('2026-01-01T00:00:00Z').getTime() + i * 24 * 60 * 60 * 1000);
      return { dateStr: d.toISOString().split('T')[0], quantity: 15 };
    });

    const valueClauses = records.map((_, idx) => `($1, $${idx * 2 + 2}, $${idx * 2 + 3})`);
    const values: unknown[] = [goalId];
    records.forEach((r) => values.push(r.dateStr, r.quantity));

    await pool.query(
      `INSERT INTO daily_records (goal_id, activity_date, quantity) VALUES ${valueClauses.join(', ')}`,
      values
    );

    const countRes = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM daily_records WHERE goal_id = $1', [goalId]);
    expect(parseInt(countRes.rows[0].count, 10)).toBe(500);
  });

  it('TEST-S2-15b / AC-S2-15: rerunning the deterministic seed replaces only benchmark fixtures', async () => {
    await seedBenchmarkRecords(20);
    const firstRun = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM daily_records r
       JOIN goals g ON g.id = r.goal_id
       JOIN users u ON u.id = g.participant_id
       WHERE u.email = 'bench_user@example.com'`
    );

    await seedBenchmarkRecords(20);
    const secondRun = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM daily_records r
       JOIN goals g ON g.id = r.goal_id
       JOIN users u ON u.id = g.participant_id
       WHERE u.email = 'bench_user@example.com'`
    );

    expect(Number(firstRun.rows[0].count)).toBe(20);
    expect(Number(secondRun.rows[0].count)).toBe(20);
  }, 20000);

  it('TEST-S2-16 & TEST-S2-17 / AC-S2-16, AC-S2-17: measures authenticated read latencies and verifies p95 <= 500 ms', async () => {
    const app = createApp(pool);
    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ email: 'bench_user@example.com', password })
      .expect(200);

    // Warm-up 10 requests
    for (let i = 0; i < 10; i++) {
      await agent.get(`/api/goals/${goalId}/records`).expect(200);
    }

    // Measure 50 requests
    const latencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await agent.get(`/api/goals/${goalId}/records`).expect(200);
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    expect(p95).toBeLessThanOrEqual(500);
  });
});
