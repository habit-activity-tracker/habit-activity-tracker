import { closePool } from '../../src/db/pool.js';
import { runSeed } from '../../src/seed/seed.js';
import { resetTestDatabase } from '../helpers/testDb.js';

// LAB5: the first deployment runs the seed job once; releases must never re-seed,
// and a rerun must not overwrite data created after the first seed (R-04).
describe('LAB5 seed is insert-only', () => {
  let pool: Awaited<ReturnType<typeof resetTestDatabase>>;
  beforeAll(async () => { pool = await resetTestDatabase(); });
  afterAll(async () => { await pool.end(); await closePool(); });

  it('LAB5-5 a rerun keeps edited passwords and templates and adds no duplicates', async () => {
    await runSeed();
    await pool.query("UPDATE activity_templates SET max_value = 999 WHERE name = 'Study Time'");
    await pool.query("UPDATE users SET password_hash = 'changed' WHERE email = 'alice@example.com'");
    await runSeed();
    const template = await pool.query("SELECT max_value FROM activity_templates WHERE name = 'Study Time'");
    const user = await pool.query("SELECT password_hash FROM users WHERE email = 'alice@example.com'");
    const counts = await pool.query('SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM activity_templates) AS templates');
    expect(Number(template.rows[0].max_value)).toBe(999);
    expect(user.rows[0].password_hash).toBe('changed');
    expect(Number(counts.rows[0].users)).toBe(3);
    expect(Number(counts.rows[0].templates)).toBe(3);
  });
});
