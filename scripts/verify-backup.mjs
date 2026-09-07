import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Verifies a backup without touching the live database.
// Usage: node scripts/verify-backup.mjs [backup-dir]  (defaults to latest in backups/)
const root = process.env.BACKUP_DIR || 'backups';
const arg = process.argv[2];
const dir = arg
  ? path.resolve(arg)
  : fs
      .readdirSync(root)
      .map((d) => path.join(path.resolve(root), d))
      .filter((d) => fs.statSync(d).isDirectory())
      .sort()
      .at(-1);

if (!dir || !fs.existsSync(path.join(dir, 'db.sqlite'))) {
  console.error(`No backup database found in ${dir ?? root}.`);
  process.exit(1);
}

const db = new Database(path.join(dir, 'db.sqlite'), { readonly: true });
const failures = [];
const integrity = db.prepare('PRAGMA integrity_check').get();
if (integrity.integrity_check !== 'ok') failures.push(`integrity_check: ${integrity.integrity_check}`);

const required = ['users', 'credentials', 'reports', 'reporting_periods', 'reviews', 'audit_events'];
for (const t of required) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get();
    console.log(`${t}: ${row.c} rows`);
  } catch {
    failures.push(`missing table: ${t}`);
  }
}
const uploads = path.join(dir, 'uploads');
console.log(`uploads snapshot: ${fs.existsSync(uploads) ? 'present' : 'MISSING'}`);
if (!fs.existsSync(uploads)) failures.push('uploads snapshot missing');
db.close();

if (failures.length) {
  console.error(`Backup ${dir} FAILED verification:`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`Backup ${dir} verified OK.`);
