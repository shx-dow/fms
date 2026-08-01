import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from '../src/lib/server/db/seed.ts';

const filename = process.env.SQLITE_PATH || 'data/faculty-reporting.db';

if (process.env.NODE_ENV === 'production') {
  console.warn('Warning: seeding what looks like a production database. Dev data is not meant for production.');
}

fs.mkdirSync(path.dirname(filename), { recursive: true });
const sqlite = new Database(filename);
sqlite.pragma('journal_mode = WAL');
migrate(drizzle(sqlite), { migrationsFolder: path.resolve('drizzle') });
seedDatabase(sqlite);
sqlite.close();

console.log(`Seeded dev data into ${filename}`);
