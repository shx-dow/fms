import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
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

export interface ReviewQueueRow {
  id: string;
  status: string;
  updated_at: string;
  completion: number;
  submitted_at: string | null;
  faculty_name: string;
  faculty_email: string;
  period_starts_on: string;
  period_label?: string;
}

export interface MissingFacultyRow {
  id: string;
  name: string;
  email: string;
}

export interface WeekRow {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  due_on: string;
  is_open: number;
  status: string | null;
  completion: number | null;
  report_id: string | null;
}

export interface WeekAggregateRow {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  due_on: string;
  is_open: number;
  total: number;
  submitted: number;
  approved: number;
  drafts: number;
}

export interface PeriodReportRow {
  id: string;
  status: string;
  completion: number;
  summary: string | null;
  submitted_at: string | null;
  updated_at: string;
  faculty_name: string;
  faculty_email: string;
}

export interface ExportTeachingRow {
  course_code: string;
  course_name: string;
  program_level: string;
  class_type: string;
  scheduled: number;
  conducted: number;
  missed: number;
  syllabus_lecture: number | null;
}

export interface DashboardFacultyRow {
  id: string;
  name: string;
  email: string;
  status: string | null;
  completion: number | null;
  submitted_at: string | null;
}

export interface TrendRow {
  starts_on: string;
  total: number;
  submitted: number;
  avg_completion: number;
  submission_rate: number;
  period?: string;
}

export interface PeriodStatsRow {
  starts_on: string;
  due_on: string;
  faculty_count: number;
  submitted_count: number;
  period?: string;
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
    SELECT r.id, r.status, r.completion, r.updated_at, r.submitted_at, p.starts_on, p.ends_on, p.due_on
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
      tx.run(sql`INSERT INTO audit_events VALUES (${randomUUID()}, ${input.userId}, 'REPORT_SUBMITTED', 'REPORT', ${input.reportId}, ${input.now})`);
    }
  });
}

export function listReviewQueue(opts: { departmentId?: string }, db: Db = defaultDb): ReviewQueueRow[] {
  const clauses: SQL[] = [sql`r.status IN ('SUBMITTED','CHANGES_REQUIRED','APPROVED')`];
  if (opts.departmentId) clauses.push(sql`u.department_id = ${opts.departmentId}`);
  // SAFETY: The SELECT list matches ReviewQueueRow (report, user and period columns).
  return db.all(sql`
    SELECT r.id, r.status, r.updated_at, r.completion, r.submitted_at, u.name AS faculty_name,
           u.email AS faculty_email, p.starts_on AS period_starts_on
    FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id
    WHERE ${sql.join(clauses, sql` AND `)}
    ORDER BY r.updated_at DESC
  `) as ReviewQueueRow[];
}

export function getReviewScope(reportId: string, opts: { departmentId?: string }, db: Db = defaultDb) {
  const where = opts.departmentId
    ? sql`r.id = ${reportId} AND u.department_id = ${opts.departmentId}`
    : sql`r.id = ${reportId}`;
  // SAFETY: The SELECT list projects exactly the report id column.
  return db.get(sql`SELECT r.id FROM reports r JOIN users u ON u.id = r.faculty_id WHERE ${where}`) as
    | { id: string }
    | undefined;
}

export function setReportStatus(reportId: string, status: string, updatedAt: string, db: Db = defaultDb) {
  db.run(sql`UPDATE reports SET status = ${status}, updated_at = ${updatedAt} WHERE id = ${reportId}`);
}

export function listMissing(periodId: string, opts: { departmentId?: string }, db: Db = defaultDb): MissingFacultyRow[] {
  const clauses: SQL[] = [
    sql`u.role = 'FACULTY'`,
    sql`u.is_active = 1`,
    sql`u.id NOT IN (SELECT r.faculty_id FROM reports r WHERE r.period_id = ${periodId} AND r.status IN ('SUBMITTED', 'APPROVED'))`,
  ];
  if (opts.departmentId) clauses.push(sql`u.department_id = ${opts.departmentId}`);
  // SAFETY: The SELECT list projects exactly the three user columns in MissingFacultyRow.
  return db.all(sql`
    SELECT u.id, u.name, u.email FROM users u
    WHERE ${sql.join(clauses, sql` AND `)}
  `) as MissingFacultyRow[];
}

export function listWeeksForFaculty(facultyId: string, db: Db = defaultDb): WeekRow[] {
  // SAFETY: The SELECT list matches WeekRow (period columns plus the left-joined report columns).
  return db.all(sql`
    SELECT p.id, p.label, p.starts_on, p.ends_on, p.due_on, p.is_open,
           r.status, r.completion, r.id AS report_id
    FROM reporting_periods p
    LEFT JOIN reports r ON r.period_id = p.id AND r.faculty_id = ${facultyId}
    ORDER BY p.starts_on ASC
  `) as WeekRow[];
}

export function listWeeksAggregate(
  opts: { departmentId?: string },
  db: Db = defaultDb,
): WeekAggregateRow[] {
  const dept = opts.departmentId ? sql`AND u.department_id = ${opts.departmentId}` : sql``;
  // SAFETY: The SELECT list matches WeekAggregateRow (period columns plus the aggregate counts).
  return db.all(sql`
    SELECT p.id, p.label, p.starts_on, p.ends_on, p.due_on, p.is_open,
      COUNT(u.id) AS total,
      COALESCE(SUM(CASE WHEN r.status IN ('SUBMITTED','CHANGES_REQUIRED') THEN 1 ELSE 0 END), 0) AS submitted,
      COALESCE(SUM(CASE WHEN r.status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved,
      COALESCE(SUM(CASE WHEN r.status = 'DRAFT' THEN 1 ELSE 0 END), 0) AS drafts
    FROM reporting_periods p
    CROSS JOIN users u
    LEFT JOIN reports r ON r.period_id = p.id AND r.faculty_id = u.id
    WHERE u.role = 'FACULTY' AND u.is_active = 1 ${dept}
    GROUP BY p.id
    ORDER BY p.starts_on ASC
  `) as WeekAggregateRow[];
}

export function listReportsForPeriod(
  periodId: string,
  opts: { departmentId?: string },
  db: Db = defaultDb,
): PeriodReportRow[] {
  const dept = opts.departmentId ? sql`AND u.department_id = ${opts.departmentId}` : sql``;
  // SAFETY: The SELECT list matches PeriodReportRow (report columns plus the joined user columns).
  return db.all(sql`
    SELECT r.id, r.status, r.completion, r.summary, r.submitted_at, r.updated_at,
           u.name AS faculty_name, u.email AS faculty_email
    FROM reports r JOIN users u ON u.id = r.faculty_id
    WHERE r.period_id = ${periodId} ${dept}
    ORDER BY u.name
  `) as PeriodReportRow[];
}

export function getCurrentExportReport(facultyId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list projects exactly these three report columns.
  return db.get(sql`SELECT * FROM reports WHERE faculty_id = ${facultyId} ORDER BY updated_at DESC LIMIT 1`) as
    | { id: string; status: string; summary?: string }
    | undefined;
}

export function listExportTeaching(reportId: string, db: Db = defaultDb): ExportTeachingRow[] {
  // SAFETY: The SELECT list matches ExportTeachingRow (the exported teaching columns).
  return db.all(sql`
    SELECT course_code, course_name, program_level, class_type, scheduled, conducted, missed, syllabus_lecture
    FROM teaching_records WHERE report_id = ${reportId}
  `) as ExportTeachingRow[];
}

export function listDashboardFaculty(periodId: string | null, db: Db = defaultDb): DashboardFacultyRow[] {
  // SAFETY: The SELECT list matches DashboardFacultyRow (user columns plus the left-joined report columns).
  return db.all(sql`
    SELECT u.id, u.name, u.email, r.status, r.completion, r.submitted_at
    FROM users u LEFT JOIN reports r ON r.faculty_id = u.id AND r.period_id = ${periodId}
    WHERE u.role = 'FACULTY' AND u.is_active = 1 ORDER BY u.name
  `) as DashboardFacultyRow[];
}

export function listTrends(
  opts: { facultyId?: string; departmentId?: string },
  db: Db = defaultDb,
): TrendRow[] {
  const clauses: SQL[] = [sql`p.is_open = 0`];
  if (opts.facultyId) clauses.push(sql`r.faculty_id = ${opts.facultyId}`);
  if (opts.departmentId) clauses.push(sql`u.department_id = ${opts.departmentId}`);
  // SAFETY: The SELECT list matches TrendRow (period column plus the aggregate expressions).
  return db.all(sql`
    SELECT p.starts_on, COUNT(r.id) AS total,
      SUM(CASE WHEN r.status IN ('SUBMITTED','APPROVED') THEN 1 ELSE 0 END) AS submitted,
      ROUND(AVG(r.completion), 0) AS avg_completion,
      ROUND(AVG(CASE WHEN r.status IN ('SUBMITTED','APPROVED') THEN 1 ELSE 0 END) * 100, 0) AS submission_rate
    FROM reporting_periods p
    LEFT JOIN reports r ON r.period_id = p.id
    LEFT JOIN users u ON u.id = r.faculty_id
    WHERE ${sql.join(clauses, sql` AND `)}
    GROUP BY p.id ORDER BY p.starts_on DESC LIMIT 6
  `) as TrendRow[];
}

export function getCurrentPeriodStats(opts: { departmentId?: string }, db: Db = defaultDb): PeriodStatsRow[] {
  const facultySub = opts.departmentId ? sql` AND department_id = ${opts.departmentId}` : sql``;
  const reportSub = opts.departmentId ? sql` AND u.department_id = ${opts.departmentId}` : sql``;
  // SAFETY: The SELECT list matches PeriodStatsRow (period columns plus the subquery counts).
  return db.all(sql`
    SELECT p.starts_on, p.due_on,
      (SELECT COUNT(*) FROM users WHERE role = 'FACULTY' AND is_active = 1${facultySub}) AS faculty_count,
      (SELECT COUNT(*) FROM reports r JOIN users u ON u.id = r.faculty_id
        WHERE r.period_id = p.id AND r.status IN ('SUBMITTED','APPROVED')${reportSub}) AS submitted_count
    FROM reporting_periods p WHERE p.is_open = 1 LIMIT 1
  `) as PeriodStatsRow[];
}