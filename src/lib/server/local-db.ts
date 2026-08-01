import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '$env/dynamic/private';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from './db/seed';

const migrationsFolder = process.env.MIGRATIONS_DIR || path.resolve('drizzle');

export function createDatabase(opts: { filename?: string; seed?: boolean; migrationsFolder?: string } = {}) {
  const { seed = false } = opts;
  const filename = opts.filename || env.SQLITE_PATH || 'data/faculty-reporting.db';
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const sqlite = new Database(filename);
  sqlite.pragma('journal_mode = WAL');
  migrate(drizzle(sqlite), { migrationsFolder: opts.migrationsFolder || migrationsFolder });
  if (seed) seedDatabase(sqlite);
  return sqlite;
}
