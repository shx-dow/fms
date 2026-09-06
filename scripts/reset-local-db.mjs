import fs from 'node:fs';
const file = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
for (const suffix of ['', '-wal', '-shm']) {
  const target = `${file}${suffix}`;
  if (fs.existsSync(target)) fs.rmSync(target);
}
console.log(`Removed ${file} (+wal/shm). Recreate it with: npm run seed`);
