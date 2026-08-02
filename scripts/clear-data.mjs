import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dbFile = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
const uploadDir = process.env.UPLOAD_DIR || 'data/uploads';
const keep = ['departments', 'users', 'credentials'];

const db = new Database(dbFile);
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all()
  .map((r) => r.name);

for (const t of tables) {
  if (keep.includes(t) || t === '__drizzle_migrations') continue;
  db.prepare(`DELETE FROM "${t}"`).run();
}

if (fs.existsSync(uploadDir)) {
  fs.rmSync(uploadDir, { recursive: true, force: true });
}

db.close();

const remaining = tables.filter((t) => keep.includes(t)).join(', ');
console.log(`Cleared all data from ${dbFile}.`);
console.log(`Kept (${remaining}): users, credentials, departments, reporting_periods.`);
console.log(`Removed uploads directory: ${uploadDir}`);
