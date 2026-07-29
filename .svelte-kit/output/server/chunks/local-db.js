import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { b as private_env } from "./shared-server.js";
import fs from "node:fs";
import path from "node:path";
const filename = private_env.SQLITE_PATH || "data/faculty-reporting.db";
fs.mkdirSync(path.dirname(filename), { recursive: true });
const sqlite = new Database(filename);
sqlite.pragma("journal_mode = WAL");
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
CREATE TABLE IF NOT EXISTS report_exceptions (id TEXT PRIMARY KEY, report_id TEXT NOT NULL, actor_id TEXT NOT NULL, reason TEXT NOT NULL, allowed_until TEXT NOT NULL, created_at TEXT NOT NULL);
`);
try {
  sqlite.exec("ALTER TABLE reports ADD COLUMN reopened_until TEXT");
} catch {
}
try {
  sqlite.exec("ALTER TABLE reports ADD COLUMN reopen_reason TEXT");
} catch {
}
sqlite.prepare("INSERT OR IGNORE INTO departments VALUES ('cse', 'CSE', 'Computer Science and Engineering')").run();
sqlite.prepare("INSERT OR IGNORE INTO users VALUES ('dev-faculty-1', 'Faculty member', 'ananya.rao@example.edu', 'FACULTY', 'cse', 1), ('dev-hod-1', 'HOD', 'hod.cse@example.edu', 'HOD', 'cse', 1), ('dev-admin-1', 'Administrator', 'admin@example.edu', 'ADMIN', NULL, 1)").run();
sqlite.prepare("INSERT OR IGNORE INTO credentials VALUES ('dev-faculty-1', '5fe3c91dbf21bce504960f6494a585db:619af50403ec244d5f6c2ea06f2468675a93a46042d40473fcbe81b137dbf38fcd1d905a4f89521785626ce2e454513bc8c600b000ec2eafb8dc2badc6d07265'), ('dev-hod-1', '1ef8c7c2aa29ae03686e66331f8a7eaf:d1ba524089acdbfa7d14bdcedf059393b84e065e49c8ff7766e3fa64f9d4b2a339e50ec0d170f769029449cc76db878ed9cf20f93132b1f3be852090473a4e3b'), ('dev-admin-1', '1432d24266710fcb1b7cbf1d3e50fcb3:b1647c946a4287f806d83470f6164fe022ad94113d7161987d334cb12a07f6d5a3f8e618331cb05212e7b8a6d0c8f4dc8218f7ae942e4627da8a17953e9aa266')").run();
sqlite.prepare("INSERT OR REPLACE INTO reporting_periods VALUES ('week-2026-07-27', 'Week of 27 July 2026', 'WEEKLY', '2026-07-27', '2026-07-31', '2026-07-31T18:00:00+05:30', 1)").run();
drizzle(sqlite);
export {
  sqlite as s
};
