import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const SQLITE_PATH = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'data/uploads';

const KEEP = new Set(['users', 'credentials', 'departments', '__drizzle_migrations']);
const CLEAR = [
  'reports',
  'teaching_records',
  'research_records',
  'institutional_duties',
  'outreach_records',
  'reviews',
  'report_exceptions',
  'attachments',
  'notification_reads',
  'audit_events',
  'sessions',
  'reporting_periods',
];

const db = new Database(SQLITE_PATH);
const tx = db.transaction(() => {
  for (const t of CLEAR) db.prepare(`DELETE FROM "${t}"`).run();
});
tx();
db.close();

if (fs.existsSync(UPLOAD_DIR)) {
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    fs.rmSync(path.join(UPLOAD_DIR, f), { recursive: true, force: true });
  }
}

console.log(`Cleared tables: ${CLEAR.join(', ')}`);
console.log(`Kept tables: ${[...KEEP].join(', ')}`);
