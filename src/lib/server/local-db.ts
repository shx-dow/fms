import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '$env/dynamic/private';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from './db/seed';

const migrationsFolder = process.env.MIGRATIONS_DIR || path.resolve('drizzle');

/** Demo users carry known credentials; seeding production is opt-in only. */
export function seedAllowed(): boolean {
  if (env.NODE_ENV !== 'production') return true;
  return env.ALLOW_PRODUCTION_SEED === '1';
}

export function createDatabase(opts: { filename?: string; seed?: boolean } = {}) {
  const { seed = false } = opts;
  const filename = opts.filename || env.SQLITE_PATH || 'data/faculty-reporting.db';
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const sqlite = new Database(filename);
  sqlite.pragma('journal_mode = WAL');
  migrate(drizzle(sqlite), { migrationsFolder });
  if (seed) {
    if (!seedAllowed()) {
      sqlite.close();
      throw new Error(
        'Refusing to seed: NODE_ENV=production. Demo users ship with known passwords. Set ALLOW_PRODUCTION_SEED=1 for a deliberate bootstrap, then remove the demo users.',
      );
    }
    seedDatabase(sqlite);
  }
  return sqlite;
}