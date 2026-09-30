import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from '../src/lib/server/db/seed.ts';

const filename = process.env.SQLITE_PATH || 'data/faculty-reporting.db';

// Demo accounts ship with known credentials, so seeding a production database
// is a hard stop rather than a warning. Opt in explicitly with ALLOW_PRODUCTION_SEED=1.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== '1') {
  console.error(
    'Refusing to seed: NODE_ENV=production. This writes demo users with known passwords.\n' +
      'For a deliberate one-off bootstrap, re-run with ALLOW_PRODUCTION_SEED=1 and remove the demo users afterwards.',
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(filename), { recursive: true });
const sqlite = new Database(filename);
sqlite.pragma('journal_mode = WAL');
migrate(drizzle(sqlite), { migrationsFolder: path.resolve('drizzle') });
seedDatabase(sqlite, process.env.DEMO_PASSWORD || undefined);
sqlite.close();

console.log(`Seeded dev data into ${filename}`);
if (process.env.DEMO_PASSWORD) {
  console.log('Demo accounts use the DEMO_PASSWORD value for faculty1/2/3, hod.cse and admin.');
} else {
  console.log(
    'Demo account passwords are the hashes checked into seed.ts, whose plaintext is not published.\n' +
      'Set DEMO_PASSWORD=<value> and re-seed if you need to log in as a demo account.',
  );
}
