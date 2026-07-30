import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const dbPath = 'data/faculty-reporting.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL, department_id TEXT, is_active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS credentials (user_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS reporting_periods (id TEXT PRIMARY KEY, label TEXT NOT NULL, kind TEXT NOT NULL, starts_on TEXT NOT NULL, ends_on TEXT NOT NULL, due_on TEXT NOT NULL, is_open INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, faculty_id TEXT NOT NULL, period_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT', summary TEXT, challenges TEXT, next_goals TEXT, completion INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, submitted_at TEXT, reopened_until TEXT, reopen_reason TEXT);
  CREATE TABLE IF NOT EXISTS teaching_records (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, course_code TEXT NOT NULL, course_name TEXT NOT NULL, program_level TEXT NOT NULL, class_type TEXT NOT NULL, scheduled INTEGER NOT NULL DEFAULT 0, conducted INTEGER NOT NULL DEFAULT 0, missed INTEGER NOT NULL DEFAULT 0, missed_action TEXT, syllabus_completion REAL);
  CREATE TABLE IF NOT EXISTS research_records (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, venue_or_agency TEXT, indexing_or_quality TEXT, role TEXT, status TEXT);
  CREATE TABLE IF NOT EXISTS institutional_duties (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, activity TEXT, reach TEXT, outcome TEXT);
  CREATE TABLE IF NOT EXISTS outreach_records (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, activity TEXT NOT NULL, audience TEXT, outcome TEXT, date TEXT);
  CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, reviewer_id TEXT NOT NULL, decision TEXT NOT NULL, remarks TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS notification_reads (user_id TEXT NOT NULL, event_id TEXT NOT NULL, read_at TEXT NOT NULL, PRIMARY KEY (user_id, event_id));
  CREATE TABLE IF NOT EXISTS report_exceptions (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, actor_id TEXT NOT NULL, reason TEXT NOT NULL, allowed_until TEXT NOT NULL, created_at TEXT NOT NULL);
`);

try { db.exec('ALTER TABLE reports ADD COLUMN reopened_until TEXT'); } catch {}
try { db.exec('ALTER TABLE reports ADD COLUMN reopen_reason TEXT'); } catch {}

// Seed departments
db.prepare("INSERT OR IGNORE INTO departments VALUES ('cse', 'CSE', 'Computer Science and Engineering')").run();

// Seed users
db.prepare("DELETE FROM credentials WHERE user_id = 'dev-faculty-1'").run();
db.prepare("DELETE FROM users WHERE id = 'dev-faculty-1'").run();
db.prepare("INSERT OR IGNORE INTO users VALUES ('dev-faculty-1', 'Faculty User 1', 'faculty1@example.edu', 'FACULTY', 'cse', 1), ('dev-faculty-2', 'Faculty User 2', 'faculty2@example.edu', 'FACULTY', 'cse', 1), ('dev-hod-1', 'Department HOD', 'hod.cse@example.edu', 'HOD', 'cse', 1), ('dev-admin-1', 'System Administrator', 'admin@example.edu', 'ADMIN', NULL, 1)").run();

const facultyPassword = '5fe3c91dbf21bce504960f6494a585db:619af50403ec244d5f6c2ea06f2468675a93a46042d40473fcbe81b137dbf38fcd1d905a4f89521785626ce2e454513bc8c600b000ec2eafb8dc2badc6d07265';
db.prepare("INSERT OR IGNORE INTO credentials VALUES ('dev-faculty-1', ?), ('dev-faculty-2', ?), ('dev-hod-1', '1ef8c7c2aa29ae03686e66331f8a7eaf:d1ba524089acdbfa7d14bdcedf059393b84e065e49c8ff7766e3fa64f9d4b2a339e50ec0d170f769029449cc76db878ed9cf20f93132b1f3be852090473a4e3b'), ('dev-admin-1', '1432d24266710fcb1b7cbf1d3e50fcb3:b1647c946a4287f806d83470f6164fe022ad94113d7161987d334cb12a07f6d5a3f8e618331cb05212e7b8a6d0c8f4dc8218f7ae942e4627da8a17953e9aa266')").run(facultyPassword, facultyPassword);

// Seed current reporting period
db.prepare("INSERT OR REPLACE INTO reporting_periods VALUES ('week-2026-07-27', 'Week of 27 July 2026', 'WEEKLY', '2026-07-27', '2026-07-31', '2026-07-31T18:00:00+05:30', 1)").run();
db.prepare("INSERT OR IGNORE INTO reporting_periods VALUES ('week-2026-07-20', 'Week of 20 July 2026', 'WEEKLY', '2026-07-20', '2026-07-25', '2026-07-25T18:00:00+05:30', 0)").run();

// Create DRAFT report for Faculty User 1 in current period
const now = new Date().toISOString();
const reportId = randomUUID();
db.prepare("INSERT INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES (?, 'dev-faculty-1', 'week-2026-07-27', 'DRAFT', 40, ?, ?)").run(reportId, now, now);

// Insert teaching records — exactly as shown on the dashboard
const insertTeaching = db.prepare(
  "INSERT INTO teaching_records (id, report_id, course_code, course_name, program_level, class_type, scheduled, conducted, missed, syllabus_completion) VALUES (?, ?, ?, ?, 'B.Tech · III Year', ?, ?, ?, ?, ?)"
);

const tx = db.transaction(() => {
  insertTeaching.run(randomUUID(), reportId, 'CS201', 'Data Structures',     'Lecture',  5, 4, 1, 80);
  insertTeaching.run(randomUUID(), reportId, 'CS301', 'Algorithms',          'Lecture',  3, 3, 0, 65);
  insertTeaching.run(randomUUID(), reportId, 'CS401', 'Computer Networks',   'Tutorial', 2, 2, 0, 90);
  insertTeaching.run(randomUUID(), reportId, 'CS250', 'Database Systems',    'Lab',      4, 3, 1, 45);
});
tx();

console.log('Done — seeded draft report for Faculty User 1 with 4 teaching records.');
console.log('Report ID:', reportId);
console.log('Faculty: dev-faculty-1 (Faculty User 1)');
console.log('Period: week-2026-07-27 (Week of 27 July 2026)');
console.log('Status: DRAFT (not submitted)');
