import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

dotenv.config();

// Workspace commands execute with api/ as their working directory, while the
// documented environment file lives at the repository root.
const rootEnvPath = resolve(process.cwd(), '../.env');
if (existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });

export interface AppConfig {
  sessionSecret: string;
  databaseUrl: string;
  sessionMaxAgeHours: number;
  appTimezone: string;
  seedDemoPassword: string;
  appEnv: string;
  port: number;
  host: string;
}

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const loadConfig = (): AppConfig => {
  const sessionTtl = process.env.SESSION_TTL?.trim() || process.env.SESSION_MAX_AGE_HOURS?.trim();
  if (!sessionTtl) throw new Error('Missing required environment variable: SESSION_TTL');
  const sessionMaxAgeHours = Number(sessionTtl);
  if (!Number.isInteger(sessionMaxAgeHours) || sessionMaxAgeHours <= 0) {
    throw new Error('SESSION_MAX_AGE_HOURS must be a positive integer.');
  }

  const appTimezone = required('APP_TIMEZONE');
  try {
    Intl.DateTimeFormat('en-US', { timeZone: appTimezone });
  } catch {
    throw new Error('APP_TIMEZONE must be a valid IANA time zone.');
  }

  const databaseUrl = required('DATABASE_URL');
  try {
    new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid connection URL.');
  }

  const port = Number(process.env.PORT?.trim() || '3000');
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  return {
    sessionSecret: required('SESSION_SECRET'),
    databaseUrl,
    sessionMaxAgeHours,
    appTimezone,
    seedDemoPassword: required('SEED_DEMO_PASSWORD'),
    appEnv: process.env.APP_ENV?.trim() || 'development',
    port,
    host: process.env.HOST?.trim() || '0.0.0.0',
  };
};
