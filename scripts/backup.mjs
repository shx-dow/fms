import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const SQLITE_PATH = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'data/uploads';
const BACKUP_ROOT = process.env.BACKUP_DIR || 'backups';
const KEEP = Number(process.env.BACKUP_RETENTION || 14);

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`Database not found at ${SQLITE_PATH}. Nothing to back up.`);
  process.exit(1);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const destDir = path.join(path.resolve(BACKUP_ROOT), ts);
fs.mkdirSync(destDir, { recursive: true });

const dbDest = path.join(destDir, 'db.sqlite');
const src = new Database(path.resolve(SQLITE_PATH), { readonly: true });
src.exec(`VACUUM INTO '${dbDest.replace(/'/g, "''")}'`);
src.close();

if (fs.existsSync(UPLOAD_DIR)) {
  fs.cpSync(path.resolve(UPLOAD_DIR), path.join(destDir, 'uploads'), { recursive: true });
}

const dirs = fs
  .readdirSync(BACKUP_ROOT)
  .map((d) => path.join(BACKUP_ROOT, d))
  .filter((p) => fs.statSync(p).isDirectory())
  .sort();
const toDelete = dirs.slice(0, Math.max(0, dirs.length - KEEP));
for (const d of toDelete) fs.rmSync(d, { recursive: true, force: true });

const size = fs.statSync(dbDest).size;
console.log(`Backup written to ${dbDest} (${(size / 1024 / 1024).toFixed(2)} MB)`);
if (fs.existsSync(path.join(destDir, 'uploads'))) console.log('Uploads included.');
if (toDelete.length) console.log(`Pruned ${toDelete.length} old backup(s).`);
