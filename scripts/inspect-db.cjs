const DB = require('better-sqlite3');
const db = new DB(process.argv[2] || 'data/faculty-reporting.db');
const tabs = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => r.name);
console.log('TABLES: ' + tabs.join(', '));
console.log('---COUNTS---');
for (const t of tabs) {
  const c = db.prepare(`SELECT COUNT(*) c FROM "${t}"`).get().c;
  console.log(`${t}: ${c}`);
}
console.log('---USERS---');
for (const u of db.prepare('SELECT id, name, email, role FROM users ORDER BY id').all()) {
  console.log(`${u.id} | ${u.email} | ${u.role}`);
}
