import fs from 'node:fs';
const file = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
if (fs.existsSync(file)) fs.rmSync(file);
console.log(`Removed ${file}. Start the app to recreate and seed it.`);
