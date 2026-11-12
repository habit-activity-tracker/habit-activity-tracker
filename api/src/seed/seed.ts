import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { closePool, getPool } from '../db/pool.js';
import { runMigrations } from '../db/migrate.js';
import { loadConfig } from '../config/env.js';

// Insert-only: re-running never resets passwords or edited templates, so a seed
// (or a redeploy) cannot overwrite data users and managers created later.
export const runSeed = async (): Promise<void> => {
  const pool = getPool();
  await runMigrations(pool);
  const config = loadConfig();
  const passwordHash = await bcrypt.hash(config.seedDemoPassword, 12);
  const accounts = [
    ['pm1@example.com', 'program_manager'],
    ['alice@example.com', 'participant'],
    ['bob@example.com', 'participant'],
  ] as const;
  for (const [email, role] of accounts) {
    await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT ((lower(email))) DO NOTHING`,
      [email, passwordHash, role]
    );
  }
  const manager = await pool.query<{ id: string }>('SELECT id FROM users WHERE lower(email) = lower($1)', ['pm1@example.com']);
  const managerId = manager.rows[0]?.id;
  if (!managerId) throw new Error('Seed Program Manager was not created.');
  const templates = [['Study Time', 'minutes', 1, 720, true], ['Pages Read', 'pages', 1, 300, true], ['Meditation', 'minutes', 1, 120, false]] as const;
  for (const [name, unit, minValue, maxValue, isActive] of templates) {
    await pool.query(`INSERT INTO activity_templates (name, unit, min_value, max_value, is_active, created_by) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO NOTHING`, [name, unit, minValue, maxValue, isActive, managerId]);
  }
};

const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1] ? resolve(process.argv[1]) : '';
if (executedFilePath === currentFilePath) {
  runSeed()
    .then(() => closePool())
    .catch(async (error) => {
      console.error('Seed failed:', error instanceof Error ? error.message : error);
      await closePool();
      process.exitCode = 1;
    });
}
