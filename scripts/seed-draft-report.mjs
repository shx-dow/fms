import Database from 'better-sqlite3';
const db = new Database('data/faculty-reporting.db');
db.pragma('journal_mode = WAL');

const now = new Date().toISOString();

db.prepare("INSERT OR REPLACE INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES ('demo-report-current', 'dev-faculty-1', 'week-2026-07-27', 'DRAFT', 0, ?, ?)").run(now, now);

const insert = db.prepare("INSERT OR REPLACE INTO teaching_records (id, report_id, course_code, course_name, program_level, class_type, scheduled, conducted, missed, syllabus_completion) VALUES (?, 'demo-report-current', ?, ?, 'B.Tech · III Year', ?, ?, ?, ?, ?)");

const rows = [
  ['demo-tr-cs201', 'CS201', 'Data Structures',     'Lecture',  5, 4, 1, 80],
  ['demo-tr-cs301', 'CS301', 'Algorithms',          'Lecture',  3, 3, 0, 65],
  ['demo-tr-cs401', 'CS401', 'Computer Networks',   'Tutorial', 2, 2, 0, 90],
  ['demo-tr-cs250', 'CS250', 'Database Systems',    'Lab',      4, 3, 1, 45],
];

const tx = db.transaction(() => { for (const r of rows) insert.run(...r); });
tx();

console.log('Done - seeded draft report with', rows.length, 'teaching records');
