import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { resetTestDatabase } from '../helpers/testDb.js';

const password = 'test-password';
let pool: Pool;

const seedUsers = async (): Promise<void> => {
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'program_manager'), ($3, $2, 'participant'), ($4, $2, 'participant')`,
    ['pm1@example.com', passwordHash, 'alice@example.com', 'bob@example.com']
  );
};

beforeEach(async () => {
  pool = await resetTestDatabase();
  await seedUsers();
});

afterEach(async () => { if (pool) await pool.end(); });

describe('F-01 authentication and current user', () => {
  it('TEST-01.1 / AC-01.1 valid login returns safe user and sets a secure session cookie', async () => {
    const response = await request(createApp(pool)).post('/api/auth/login').send({ email: 'ALICE@example.com', password });
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(expect.objectContaining({ email: 'alice@example.com', role: 'participant' }));
    expect(response.body.user.password_hash).toBeUndefined();
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('habit_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('TEST-01.2 / AC-01.2 uses the same generic 401 for wrong password and unknown user', async () => {
    const wrongPassword = await request(createApp(pool)).post('/api/auth/login').send({ email: 'alice@example.com', password: 'wrong' });
    const unknownUser = await request(createApp(pool)).post('/api/auth/login').send({ email: 'nobody@example.com', password });
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownUser.body);
  });

  it('TEST-01.8 / AC-02a rejects malformed email with HTTP 400', async () => {
    const response = await request(createApp(pool))
      .post('/api/auth/login')
      .send({ email: 'abc', password });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_LOGIN_REQUEST');
  });

  it('TEST-01.9 / AC-02b rejects malformed JSON without creating a session', async () => {
    const response = await request(createApp(pool))
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: expect.any(String),
        details: {},
      },
    });
    expect(response.body.error.message).not.toMatch(/stack|syntax|unexpected token/i);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('TEST-01.3 / AC-01.3 returns the current user and rejects the session after logout', async () => {
    const agent = request.agent(createApp(pool));
    await agent.post('/api/auth/login').send({ email: 'alice@example.com', password }).expect(200);
    await agent.get('/api/me').expect(200);
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/me').expect(401);
  });

  it('TEST-01.4 / AC-01.4 rejects a protected request without a session', async () => {
    const response = await request(createApp(pool)).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('SESSION_REQUIRED');
  });

  it('TEST-01.5 / AC-01.5 rejects a deactivated account with the generic credential error', async () => {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, $3, false)', ['disabled@example.com', passwordHash, 'participant']);
    const disabled = await request(createApp(pool)).post('/api/auth/login').send({ email: 'disabled@example.com', password });
    const unknown = await request(createApp(pool)).post('/api/auth/login').send({ email: 'missing@example.com', password });
    expect(disabled.status).toBe(401);
    expect(disabled.body).toEqual(unknown.body);
  });

  it('TEST-01.6 / AC-01.6 stores bcrypt hashes rather than plaintext passwords', async () => {
    const row = (await pool.query('SELECT password_hash FROM users WHERE email = $1', ['alice@example.com'])).rows[0];
    expect(row.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(Number(row.password_hash.slice(4, 6))).toBeGreaterThanOrEqual(12);
    expect(row.password_hash).not.toBe(password);
  });

  it('TEST-01.7 / AC-01.7 rejects an expired session with 401', async () => {
    const agent = request.agent(createApp(pool));
    await agent.post('/api/auth/login').send({ email: 'alice@example.com', password }).expect(200);
    await pool.query('UPDATE sessions SET expires_at = now() - interval \'1 second\'');
    const response = await agent.get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('SESSION_REQUIRED');
  });
});
