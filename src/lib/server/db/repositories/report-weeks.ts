import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

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

export function listWeeksAggregate(opts: { departmentId?: string }, db: Db = defaultDb): WeekAggregateRow[] {
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

export function listReportsForPeriod(periodId: string, opts: { departmentId?: string }, db: Db = defaultDb): PeriodReportRow[] {
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
