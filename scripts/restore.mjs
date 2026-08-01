import fs from 'node:fs';
import path from 'node:path';

const SQLITE_PATH = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
const BACKUP_ROOT = process.env.BACKUP_DIR || 'backups';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'data/uploads';

function usage() {
  console.error('Usage: node scripts/restore.mjs <path-to-backup>|--latest [--yes]');
  console.error('Backups live under BACKUP_DIR (default: backups) as <timestamp>/db.sqlite [+ uploads/].');
  process.exit(1);
}

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const target = args.find((a) => a !== '--yes');

if (!target) usage();

let srcDir;
if (target === '--latest') {
  const dirs = fs
    .readdirSync(BACKUP_ROOT)
    .map((d) => path.join(BACKUP_ROOT, d))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort();
  if (!dirs.length) {
    console.error(`No backups found under ${BACKUP_ROOT}.`);
    process.exit(1);
  }
  srcDir = dirs[dirs.length - 1];
} else {
  const resolved = path.resolve(target);
  srcDir = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
}

const dbSource = path.join(srcDir, 'db.sqlite');
if (!fs.existsSync(dbSource)) {
  console.error(`No db.sqlite found in ${srcDir}.`);
  process.exit(1);
}

const uploadsSource = path.join(srcDir, 'uploads');
if (fs.existsSync(uploadsSource) && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!yes) {
  console.log(`This will REPLACE ${SQLITE_PATH} with ${dbSource}${fs.existsSync(uploadsSource) ? ` and replace uploads in ${UPLOAD_DIR}` : ''}.`);
  console.log('Pass --yes to confirm.');
  process.exit(1);
}

const dbDir = path.dirname(SQLITE_PATH);
fs.mkdirSync(dbDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
if (fs.existsSync(SQLITE_PATH)) {
  fs.renameSync(SQLITE_PATH, `${SQLITE_PATH}.pre-restore-${ts}.bak`);
}
for (const suffix of ['-wal', '-shm']) {
  const f = `${SQLITE_PATH}${suffix}`;
  if (fs.existsSync(f)) fs.rmSync(f);
}
fs.copyFileSync(dbSource, SQLITE_PATH);
if (fs.existsSync(uploadsSource)) {
  fs.cpSync(uploadsSource, UPLOAD_DIR, { recursive: true });
}

console.log(`Restored ${SQLITE_PATH} from ${dbSource}`);
if (fs.existsSync(`${SQLITE_PATH}.pre-restore-${ts}.bak`)) {
  console.log(`Previous database kept at ${SQLITE_PATH}.pre-restore-${ts}.bak`);
}
