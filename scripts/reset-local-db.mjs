import fs from 'node:fs';
const file = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
if (fs.existsSync(file)) fs.rmSync(file);
console.log(`Removed ${file}. Recreate it with: npm run seed`);
