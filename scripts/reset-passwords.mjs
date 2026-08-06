import Database from 'better-sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';

const SQLITE_PATH = process.env.SQLITE_PATH || 'data/faculty-reporting.db';
const PASSWORD = process.env.NEW_PASSWORD || 'password';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

const db = new Database(SQLITE_PATH);
const users = db.prepare('SELECT user_id FROM credentials').all();
const update = db.prepare('UPDATE credentials SET password_hash = ? WHERE user_id = ?');
const tx = db.transaction((rows) => {
  for (const u of rows) update.run(hashPassword(PASSWORD), u.user_id);
});
tx(users);
db.close();
console.log(`Reset password for ${users.length} user(s) to "${PASSWORD}".`);
