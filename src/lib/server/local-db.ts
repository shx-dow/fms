import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import fs from 'node:fs';
import path from 'node:path';

const filename = env.SQLITE_PATH || 'data/faculty-reporting.db';
fs.mkdirSync(path.dirname(filename), { recursive: true });
export const sqlite = new Database(filename);
sqlite.pragma('journal_mode = WAL');
sqlite.exec(`
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
try {
  sqlite.exec('ALTER TABLE reports ADD COLUMN reopened_until TEXT');
} catch {}
try {
  sqlite.exec('ALTER TABLE reports ADD COLUMN reopen_reason TEXT');
} catch {}
sqlite.prepare("INSERT OR IGNORE INTO departments VALUES ('cse', 'CSE', 'Computer Science and Engineering')").run();
sqlite.prepare("DELETE FROM credentials WHERE user_id = 'dev-faculty-1'").run();
sqlite.prepare("DELETE FROM users WHERE id = 'dev-faculty-1'").run();
sqlite
  .prepare(
    "INSERT OR IGNORE INTO users VALUES ('dev-faculty-1', 'Faculty User 1', 'faculty1@example.edu', 'FACULTY', 'cse', 1), ('dev-faculty-2', 'Faculty User 2', 'faculty2@example.edu', 'FACULTY', 'cse', 1), ('dev-faculty-3', 'Faculty User 3', 'faculty3@example.edu', 'FACULTY', 'cse', 1), ('dev-hod-1', 'Department HOD', 'hod.cse@example.edu', 'HOD', 'cse', 1), ('dev-admin-1', 'System Administrator', 'admin@example.edu', 'ADMIN', NULL, 1)",
  )
  .run();
const facultyPassword =
  '5fe3c91dbf21bce504960f6494a585db:619af50403ec244d5f6c2ea06f2468675a93a46042d40473fcbe81b137dbf38fcd1d905a4f89521785626ce2e454513bc8c600b000ec2eafb8dc2badc6d07265';
sqlite
  .prepare(
    "INSERT OR IGNORE INTO credentials VALUES ('dev-faculty-1', ?), ('dev-faculty-2', ?), ('dev-faculty-3', ?), ('dev-hod-1', '1ef8c7c2aa29ae03686e66331f8a7eaf:d1ba524089acdbfa7d14bdcedf059393b84e065e49c8ff7766e3fa64f9d4b2a339e50ec0d170f769029449cc76db878ed9cf20f93132b1f3be852090473a4e3b'), ('dev-admin-1', '1432d24266710fcb1b7cbf1d3e50fcb3:b1647c946a4287f806d83470f6164fe022ad94113d7161987d334cb12a07f6d5a3f8e618331cb05212e7b8a6d0c8f4dc8218f7ae942e4627da8a17953e9aa266')",
  )
  .run(facultyPassword, facultyPassword, facultyPassword);
sqlite
  .prepare(
    "INSERT OR REPLACE INTO reporting_periods VALUES ('week-2026-07-27', '', 'WEEKLY', '2026-07-27', '2026-07-31', '2026-07-31T18:00:00+05:30', 1)",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR REPLACE INTO reporting_periods VALUES ('week-2026-08-03', '', 'WEEKLY', '2026-08-03', '2026-08-07', '2026-08-07T18:00:00+05:30', 0)",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR REPLACE INTO reporting_periods VALUES ('week-2026-07-20', '', 'WEEKLY', '2026-07-20', '2026-07-24', '2026-07-24T18:00:00+05:30', 0)",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR IGNORE INTO reports (id, faculty_id, period_id, status, summary, completion, created_at, updated_at, submitted_at) VALUES ('demo-report-submitted', 'dev-faculty-1', 'week-2026-07-20', 'SUBMITTED', 'This week covered advanced database topics including indexing strategies and query optimization. Students showed strong engagement in lab sessions.', 82, '2026-07-21T10:00:00Z', '2026-07-23T16:30:00Z', '2026-07-23T16:30:00Z')",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR IGNORE INTO reports (id, faculty_id, period_id, status, summary, completion, created_at, updated_at, submitted_at) VALUES ('demo-report-approved', 'dev-faculty-2', 'week-2026-07-20', 'APPROVED', 'Covered software engineering fundamentals including Agile methodologies and sprint planning. Team project milestones were met.', 95, '2026-07-21T09:00:00Z', '2026-07-24T11:00:00Z', '2026-07-23T14:00:00Z')",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR IGNORE INTO teaching_records VALUES ('demo-tr-1', 'demo-report-submitted', 'CSE-401', 'Advanced Databases', 'B.Tech · IV Year', 'Lecture', 4, 3, 1, 'Makeup scheduled for Friday', 75), ('demo-tr-2', 'demo-report-submitted', 'CSE-401', 'Advanced Databases Lab', 'B.Tech · IV Year', 'Lab', 2, 2, 0, '', 80)",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR IGNORE INTO teaching_records VALUES ('demo-tr-3', 'demo-report-approved', 'CSE-301', 'Software Engineering', 'B.Tech · III Year', 'Lecture', 5, 5, 0, '', 90), ('demo-tr-4', 'demo-report-approved', 'CSE-302', 'Software Engineering Lab', 'B.Tech · III Year', 'Lab', 2, 2, 0, '', 100)",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR IGNORE INTO reviews (id, report_id, reviewer_id, decision, remarks, created_at) VALUES ('demo-review-1', 'demo-report-approved', 'dev-hod-1', 'APPROVED', 'Well-structured report. Good coverage of the syllabus.', '2026-07-24T11:30:00Z')",
  )
  .run();
sqlite
  .prepare(
    "INSERT OR IGNORE INTO audit_events (id, actor_id, action, entity_type, entity_id, created_at) VALUES ('demo-audit-1', 'dev-faculty-1', 'REPORT_SUBMITTED', 'REPORT', 'demo-report-submitted', '2026-07-23T16:30:00Z'), ('demo-audit-2', 'dev-faculty-2', 'REPORT_SUBMITTED', 'REPORT', 'demo-report-approved', '2026-07-23T14:00:00Z'), ('demo-audit-3', 'dev-hod-1', 'APPROVED', 'REPORT', 'demo-report-approved', '2026-07-24T11:30:00Z')",
  )
  .run();
