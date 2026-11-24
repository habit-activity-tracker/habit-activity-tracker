import dotenv from 'dotenv';
import pg from 'pg';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createApp } from '../api/src/app.js';
import request from 'supertest';

dotenv.config();

const { Pool } = pg;

const connectionString =
  process.env.BENCHMARK_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://habit:habit@localhost:5433/habit_tracker';

export interface BenchmarkResult {
  hostSpec: {
    platform: string;
    cpus: string;
    totalMemoryGB: string;
    nodeVersion: string;
    database: string;
  };
  totalRecordsInDb: number;
  warmupRequests: number;
  measuredRequests: number;
  latencies: {
    min: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
  };
  targetPassed: boolean;
  timestamp: string;
}

export const runBenchmark = async (
  warmupCount = 100,
  measuredCount = 1000
): Promise<BenchmarkResult> => {
  const pool = new Pool({ connectionString });
  console.log('Connecting to database for performance benchmark...');

  try {
    // 1. Check record count
    const countRes = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM daily_records');
    const totalRecords = parseInt(countRes.rows[0].count, 10);
    console.log(`Total daily_records in database: ${totalRecords}`);

    if (totalRecords < 100000) {
      console.warn(`WARNING: Record count (${totalRecords}) is below target 100,000. Running benchmark anyway...`);
    }

    // 2. Find benchmark user and goal
    const goalRes = await pool.query<{ id: string }>(
      `SELECT g.id FROM goals g
       JOIN users u ON g.participant_id = u.id
       WHERE u.email = 'bench_user@example.com'
       LIMIT 1`
    );

    let goalId = goalRes.rows[0]?.id;
    if (!goalId) {
      const anyGoal = await pool.query<{ id: string }>('SELECT id FROM goals LIMIT 1');
      goalId = anyGoal.rows[0]?.id;
      if (!goalId) throw new Error('No goals found in database. Run benchmark-seed first.');
    }

    // 3. Set up Express application instance with real pool
    const app = createApp(pool);
    const agent = request.agent(app);

    // Authenticate
    console.log('Authenticating as benchmark user...');
    await agent
      .post('/api/auth/login')
      .send({ email: 'bench_user@example.com', password: 'bench-password-123' })
      .expect(200);

    // 4. Warm-up Phase
    console.log(`Executing ${warmupCount} warm-up requests...`);
    for (let i = 0; i < warmupCount; i++) {
      await agent.get(`/api/goals/${goalId}/records`).expect(200);
    }
    console.log('Warm-up complete.');

    // 5. Measurement Phase
    console.log(`Executing ${measuredCount} measured read requests on /api/goals/:id/records...`);
    const latencies: number[] = [];
    const startTime = Date.now();

    for (let i = 0; i < measuredCount; i++) {
      const reqStart = performance.now();
      await agent.get(`/api/goals/${goalId}/records`).expect(200);
      const reqDuration = performance.now() - reqStart;
      latencies.push(reqDuration);

      if ((i + 1) % 200 === 0 || i === measuredCount - 1) {
        process.stdout.write(`\rProgress: ${i + 1} / ${measuredCount} requests completed...`);
      }
    }
    console.log(`\nCompleted in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);

    // 6. Percentile calculations
    latencies.sort((a, b) => a - b);
    const min = parseFloat(latencies[0].toFixed(2));
    const max = parseFloat(latencies[latencies.length - 1].toFixed(2));
    const avg = parseFloat(
      (latencies.reduce((acc, curr) => acc + curr, 0) / latencies.length).toFixed(2)
    );
    const p50 = parseFloat(latencies[Math.floor(latencies.length * 0.5)].toFixed(2));
    const p90 = parseFloat(latencies[Math.floor(latencies.length * 0.9)].toFixed(2));
    const p95 = parseFloat(latencies[Math.floor(latencies.length * 0.95)].toFixed(2));
    const p99 = parseFloat(latencies[Math.floor(latencies.length * 0.99)].toFixed(2));

    const targetPassed = p95 <= 500;

    const hostSpec = {
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      cpus: `${os.cpus()[0]?.model} (${os.cpus().length} cores)`,
      totalMemoryGB: `${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`,
      nodeVersion: process.version,
      database: 'PostgreSQL 16 Alpine on Docker Compose (port 5433)',
    };

    const result: BenchmarkResult = {
      hostSpec,
      totalRecordsInDb: totalRecords,
      warmupRequests: warmupCount,
      measuredRequests: measuredCount,
      latencies: { min, avg, p50, p90, p95, p99, max },
      targetPassed,
      timestamp: new Date().toISOString(),
    };

    console.log('\n================ BENCHMARK RESULTS ================');
    console.log(`Host Platform     : ${hostSpec.platform}`);
    console.log(`Database          : ${hostSpec.database}`);
    console.log(`Total Records     : ${totalRecords}`);
    console.log(`Requests Measured : ${measuredCount} (warmup: ${warmupCount})`);
    console.log(`Min Latency       : ${min} ms`);
    console.log(`Avg Latency       : ${avg} ms`);
    console.log(`p50 Latency       : ${p50} ms`);
    console.log(`p90 Latency       : ${p90} ms`);
    console.log(`p95 Latency       : ${p95} ms`);
    console.log(`p99 Latency       : ${p99} ms`);
    console.log(`Max Latency       : ${max} ms`);
    console.log(`Target (p95 <= 500ms): ${targetPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('===================================================\n');

    // 7. Save formatted output log
    const logDir = path.resolve('docs/evidence');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'performance-benchmark.log');

    const logContent = `# Performance Benchmark Log (S2-F10-P / NFR-01)
Timestamp: ${result.timestamp}
Feature: S2-F10-P (Performance evidence and 100k benchmark)
Status: ${targetPassed ? 'PASS' : 'FAIL'}

## Environment & Host Specification
- Platform: ${hostSpec.platform}
- CPU: ${hostSpec.cpus}
- Total Memory: ${hostSpec.totalMemoryGB}
- Node.js Version: ${hostSpec.nodeVersion}
- Database: ${hostSpec.database}

## Benchmark Configuration
- Database Table: daily_records
- Total Seeded Records: ${totalRecords}
- Tested Endpoint: GET /api/goals/:id/records
- Warm-up Requests: ${warmupCount}
- Measured Requests: ${measuredCount}

## Measured Latency Distribution (Server Turnaround, Excl. WAN Transfer)
- Min: ${min} ms
- Average: ${avg} ms
- p50 (Median): ${p50} ms
- p90: ${p90} ms
- p95: ${p95} ms (Target: <= 500 ms)
- p99: ${p99} ms
- Max: ${max} ms

## Verification Outcome
- NFR-01 Requirement: p95 <= 500 ms
- Observed p95: ${p95} ms
- Outcome: ${targetPassed ? 'COMPLIANT (PASSED)' : 'NON-COMPLIANT (FAILED)'}
`;

    fs.writeFileSync(logPath, logContent, 'utf8');
    console.log(`Benchmark log saved to: ${logPath}`);

    return result;
  } finally {
    await pool.end();
  }
};

if (process.argv[1]?.endsWith('benchmark.ts')) {
  runBenchmark(100, 1000)
    .then((res) => {
      process.exit(res.targetPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Benchmark execution error:', err);
      process.exit(1);
    });
}
