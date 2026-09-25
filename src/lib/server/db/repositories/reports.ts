import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface TeachingRow {
  courseCode: string;
  courseName: string;
  programLevel: string;
  classType: string;
  scheduled: number;
  conducted: number;
  missed: number;
  missedAction: string | null;
  syllabusCompletion: number | null;
  syllabusLecture?: number | null;
}

export interface SaveReportInput {
  reportId: string;
  userId: string;
  now: string;
  summary: string | null;
  challenges: string | null;
  nextGoals: string | null;
  completion: number;
  status: 'SUBMITTED' | 'DRAFT';
  teaching: TeachingRow[];
}

export interface ReportRow {
  id: string;
  faculty_id: string;
  period_id: string;
  status: string;
  summary: string | null;
  challenges: string | null;
  next_goals: string | null;
  completion: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reopened_until: string | null;
  reopen_reason: string | null;
  research_empty: number | null;
  duties_empty: number | null;
  outreach_empty: number | null;
}

const SECTION_EMPTY_COLUMNS = {
  research: 'research_empty',
  duties: 'duties_empty',
  outreach: 'outreach_empty',
} as const;

export type ActivitySection = keyof typeof SECTION_EMPTY_COLUMNS;

export function setSectionEmpty(reportId: string, section: ActivitySection, empty: boolean, db: Db = defaultDb) {
  const column = SECTION_EMPTY_COLUMNS[section];
  db.run(sql`UPDATE reports SET ${sql.raw(column)} = ${empty ? 1 : 0}, updated_at = ${new Date().toISOString()} WHERE id = ${reportId}`);
}

export interface ReportWithPeriod extends ReportRow {
  period_starts_on: string;
  due_on: string;
  period_label?: string;
}

export interface ReportWithFaculty extends ReportWithPeriod {
  faculty_name: string;
  faculty_email: string;
}

export interface ReportForPdf extends ReportWithFaculty {
  department_id: string | null;
  department_name: string | null;
}

export interface ReportHistoryRow {
  id: string;
  status: string;
  completion: number;
  updated_at: string;
  submitted_at: string | null;
  period_id: string;
  starts_on: string;
  ends_on: string;
  due_on: string;
  period_label?: string;
}

export interface LatestReportRow extends ReportRow {
  starts_on: string;
  due_on: string;
  label?: string;
}

export interface LatestReportWithFaculty extends ReportRow {
  faculty_name: string;
  faculty_email: string;
  period_starts_on: string;
  period_label?: string;
}

export interface TeachingStatsRow {
  scheduled: number;
  conducted: number;
  syllabus_lecture: number;
}

export function getReportForPeriod(facultyId: string, periodId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list matches ReportWithPeriod (report columns plus the joined period columns).
  return db.get(sql`
    SELECT r.*, p.starts_on AS period_starts_on, p.due_on
    FROM reports r JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.faculty_id = ${facultyId} AND r.period_id = ${periodId} LIMIT 1
  `) as ReportWithPeriod | undefined;
}

export function getReportById(id: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list matches ReportWithPeriod (report columns plus the joined period columns).
  return db.get(sql`
    SELECT r.*, p.starts_on AS period_starts_on, p.due_on
    FROM reports r JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.id = ${id}
  `) as ReportWithPeriod | undefined;
}

export function getReportByIdWithFaculty(id: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list matches ReportWithFaculty (report plus joined user and period columns).
  return db.get(sql`
    SELECT r.*, u.name AS faculty_name, u.email AS faculty_email, p.starts_on AS period_starts_on
    FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.id = ${id}
  `) as ReportWithFaculty | undefined;
}

export function getReportByIdForPdf(id: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list matches ReportForPdf (report, user, department and period columns).
  return db.get(sql`
    SELECT r.*, u.name AS faculty_name, u.email AS faculty_email, u.department_id, d.name AS department_name,
           p.starts_on AS period_starts_on
    FROM reports r
    JOIN users u ON u.id = r.faculty_id
    LEFT JOIN departments d ON d.id = u.department_id
    JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.id = ${id}
  `) as ReportForPdf | undefined;
}

export function getReportForUser(reportId: string, userId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list projects exactly these four columns from reports and reporting_periods.
  return db.get(sql`
    SELECT r.status, r.reopened_until, p.due_on, p.is_open
    FROM reports r JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.id = ${reportId} AND r.faculty_id = ${userId}
  `) as
    | { status: string; reopened_until?: string | null; due_on: string; is_open: number }
    | undefined;
}

export function getOwnerContext(reportId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list projects exactly these two columns from reports and users.
  return db.get(sql`
    SELECT r.faculty_id, u.department_id AS faculty_dept
    FROM reports r JOIN users u ON u.id = r.faculty_id
    WHERE r.id = ${reportId}
  `) as { faculty_id: string; faculty_dept: string | null } | undefined;
}

export function insertReport(
  fields: { id: string; facultyId: string; periodId: string; createdAt: string; updatedAt: string },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at)
    VALUES (${fields.id}, ${fields.facultyId}, ${fields.periodId}, 'DRAFT', 0, ${fields.createdAt}, ${fields.updatedAt})
  `);
}

export function insertReportOrIgnore(
  fields: { id: string; facultyId: string; periodId: string; createdAt: string; updatedAt: string },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT OR IGNORE INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at)
    VALUES (${fields.id}, ${fields.facultyId}, ${fields.periodId}, 'DRAFT', 0, ${fields.createdAt}, ${fields.updatedAt})
  `);
}

export function listReportHistory(facultyId: string, db: Db = defaultDb): ReportHistoryRow[] {
  // SAFETY: The SELECT list matches ReportHistoryRow (report columns plus the joined period columns).
  return db.all(sql`
    SELECT r.id, r.status, r.completion, r.updated_at, r.submitted_at, r.period_id, p.starts_on, p.ends_on, p.due_on
    FROM reports r JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.faculty_id = ${facultyId} ORDER BY p.starts_on DESC
  `) as ReportHistoryRow[];
}



export function getLatestReportForUser(facultyId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list matches LatestReportRow (report columns plus the joined period columns).
  return db.get(sql`
    SELECT r.*, p.starts_on, p.due_on
    FROM reports r JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.faculty_id = ${facultyId}
    ORDER BY (CASE WHEN p.is_open = 1 THEN 0 ELSE 1 END), p.starts_on DESC LIMIT 1
  `) as LatestReportRow | undefined;
}

export function getLatestReportWithFaculty(facultyId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list matches LatestReportWithFaculty (report plus joined user and period columns).
  return db.get(sql`
    SELECT r.*, u.name AS faculty_name, u.email AS faculty_email, p.starts_on AS period_starts_on
    FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.faculty_id = ${facultyId} ORDER BY r.updated_at DESC LIMIT 1
  `) as LatestReportWithFaculty | undefined;
}

export function getTeachingStats(reportId: string, db: Db = defaultDb) {
  // SAFETY: The aggregated SUM/AVG expressions return numeric values matching TeachingStatsRow.
  return db.get(sql`
    SELECT COALESCE(SUM(scheduled),0) AS scheduled, COALESCE(SUM(conducted),0) AS conducted,
           COALESCE(ROUND(AVG(syllabus_lecture)),0) AS syllabus_lecture
    FROM teaching_records WHERE report_id = ${reportId}
  `) as TeachingStatsRow;
}

export function saveReport(input: SaveReportInput, db: Db = defaultDb) {
  db.transaction((tx) => {
    tx.run(sql`
      UPDATE reports
      SET summary = ${input.summary ?? null}, challenges = ${input.challenges ?? null}, next_goals = ${input.nextGoals ?? null},
          completion = ${input.completion}, updated_at = ${input.now}, status = ${input.status},
          submitted_at = CASE WHEN ${input.status} = 'SUBMITTED' THEN ${input.now} ELSE submitted_at END
      WHERE id = ${input.reportId} AND faculty_id = ${input.userId}
    `);
    tx.run(sql`DELETE FROM teaching_records WHERE report_id = ${input.reportId}`);
    for (const row of input.teaching) {
      tx.run(sql`
        INSERT INTO teaching_records (id, report_id, course_code, course_name, program_level, class_type,
          scheduled, conducted, missed, missed_action, syllabus_completion, syllabus_lecture)
        VALUES (${randomUUID()}, ${input.reportId}, ${row.courseCode}, ${row.courseName}, ${row.programLevel},
          ${row.classType}, ${Number(row.scheduled ?? 0)}, ${Number(row.conducted ?? 0)}, ${Number(row.missed ?? 0)},
          ${row.missedAction ?? null}, ${row.syllabusCompletion ?? null}, ${row.syllabusLecture ?? null})
      `);
    }
    if (input.status === 'SUBMITTED') {
      tx.run(sql`INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, created_at) VALUES (${randomUUID()}, ${input.userId}, 'REPORT_SUBMITTED', 'REPORT', ${input.reportId}, ${input.now})`);
    }
  });
}



export function setReportStatus(reportId: string, status: string, updatedAt: string, db: Db = defaultDb) {
  db.run(sql`UPDATE reports SET status = ${status}, updated_at = ${updatedAt} WHERE id = ${reportId}`);
}

// Focused query modules split out of this file; re-exported so existing imports
// keep a single entry point for report data.
export { listReviewQueue, getReviewScope, listMissing } from './report-review';
export type { ReviewQueueRow, MissingFacultyRow } from './report-review';

export { listWeeksForFaculty, listWeeksAggregate, listReportsForPeriod } from './report-weeks';
export type { WeekRow, WeekAggregateRow, PeriodReportRow } from './report-weeks';

export {
  MAX_EXPORT_TEACHING_ROWS,
  getReportForExport,
  listExportTeaching,
  countExportTeaching,
} from './report-export';
export type { ExportReportFilter, ExportTeachingRow } from './report-export';

export { listDashboardFaculty, listTrends, getCurrentPeriodStats } from './report-trends';
export type { DashboardFacultyRow, TrendRow, PeriodStatsRow } from './report-trends';
