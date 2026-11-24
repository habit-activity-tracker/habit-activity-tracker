import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

const connectionString =
  process.env.BENCHMARK_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://habit:habit@localhost:5433/habit_tracker';

const isProductionTarget =
  process.env.NODE_ENV === 'production' ||
  process.env.APP_ENV === 'production' ||
  /(?:cloudsql|rds\.amazonaws\.com|supabase\.co)/i.test(connectionString);

if (isProductionTarget) {
  console.error('CRITICAL: Benchmark seeding is strictly forbidden in production!');
  process.exit(1);
}

export const runBenchmarkSeed = async (targetCount = 100000): Promise<{ count: number; goalId: string }> => {
  const pool = new Pool({ connectionString });
  console.log(`Connecting to database at ${connectionString.replace(/:[^:@]+@/, ':****@')}...`);

  try {
    const passwordHash = await bcrypt.hash('bench-password-123', 10);
    // 1. Ensure benchmark user exists
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ('bench_user@example.com', $1, 'participant')
       ON CONFLICT ((lower(email))) DO UPDATE SET role = 'participant'
       RETURNING id`,
      [passwordHash]
    );
    const userId = userRes.rows[0].id;

    // 2. Ensure benchmark manager and template exist
    const pmRes = await pool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ('bench_pm@example.com', $1, 'program_manager')
       ON CONFLICT ((lower(email))) DO UPDATE SET role = 'program_manager'
       RETURNING id`,
      [passwordHash]
    );
    const pmId = pmRes.rows[0].id;

    const tplRes = await pool.query<{ id: string }>(
      `INSERT INTO activity_templates (name, unit, min_value, max_value, is_active, created_by)
       VALUES ('Benchmark Metric', 'units', 1, 1000, true, $1)
       ON CONFLICT (name) DO UPDATE SET is_active = true
       RETURNING id`,
      [pmId]
    );
    const templateId = tplRes.rows[0].id;

    // 3. Remove only the previous dedicated benchmark fixtures.  This makes a rerun
    // deterministic without changing normal users, templates, goals, or records.
    await pool.query(
      `DELETE FROM goals
       WHERE participant_id = $1 AND template_id = $2`,
      [userId, templateId]
    );

    // 4. Create benchmark goals (20 goals to cleanly distribute 100k records: 5,000 records/goal)
    const goalIds: string[] = [];
    const goalsCount = 20;
    const recordsPerGoal = Math.ceil(targetCount / goalsCount);

    console.log(`Setting up ${goalsCount} benchmark goals (${recordsPerGoal} records per goal)...`);

    for (let i = 0; i < goalsCount; i++) {
      const goalRes = await pool.query<{ id: string }>(
        `INSERT INTO goals (participant_id, template_id, target, start_date, end_date)
         VALUES ($1, $2, 500000, '2000-01-01', '2030-12-31')
         RETURNING id`,
        [userId, templateId]
      );
      goalIds.push(goalRes.rows[0].id);
    }

    const primaryGoalId = goalIds[0];

    // 5. Batch insert daily records using multi-row inserts
    console.log(`Seeding ${targetCount} daily records in batches...`);
    const startTime = Date.now();
    const batchSize = 2500;
    let totalInserted = 0;

    const baseDate = new Date('2000-01-01T00:00:00Z');

    for (let g = 0; g < goalIds.length; g++) {
      const gId = goalIds[g];
      let goalRecords: { dateStr: string; quantity: number }[] = [];

      for (let r = 0; r < recordsPerGoal && totalInserted + goalRecords.length < targetCount; r++) {
        const d = new Date(baseDate.getTime() + r * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const quantity = 10 + (r % 100);
        goalRecords.push({ dateStr, quantity });

        if (goalRecords.length >= batchSize) {
          await insertBatch(pool, gId, goalRecords);
          totalInserted += goalRecords.length;
          process.stdout.write(`\rProgress: ${totalInserted} / ${targetCount} records seeded...`);
          goalRecords = [];
        }
      }

      if (goalRecords.length > 0) {
        await insertBatch(pool, gId, goalRecords);
        totalInserted += goalRecords.length;
        process.stdout.write(`\rProgress: ${totalInserted} / ${targetCount} records seeded...`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nSuccessfully seeded ${totalInserted} records in ${duration}s.`);

    // 6. Verify total record count in database
    const countRes = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM daily_records');
    const finalCount = parseInt(countRes.rows[0].count, 10);
    console.log(`Verified total daily_records in database: ${finalCount}`);

    return { count: finalCount, goalId: primaryGoalId };
  } finally {
    await pool.end();
  }
};

const insertBatch = async (
  pool: pg.Pool,
  goalId: string,
  records: { dateStr: string; quantity: number }[]
): Promise<void> => {
  const values: unknown[] = [];
  const valueClauses: string[] = [];

  records.forEach((rec, idx) => {
    const offset = idx * 3;
    valueClauses.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
    values.push(goalId, rec.dateStr, rec.quantity);
  });

  const query = `
    INSERT INTO daily_records (goal_id, activity_date, quantity)
    VALUES ${valueClauses.join(', ')}
    ON CONFLICT (goal_id, activity_date) DO NOTHING
  `;

  await pool.query(query, values);
};

// Auto-run if executed directly
if (process.argv[1]?.endsWith('benchmark-seed.ts')) {
  runBenchmarkSeed(100000)
    .then(() => {
      console.log('Benchmark seed completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Benchmark seed failed:', err);
      process.exit(1);
    });
}
