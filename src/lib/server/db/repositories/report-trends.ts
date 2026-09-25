import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

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

export function listDashboardFaculty(periodId: string | null, db: Db = defaultDb): DashboardFacultyRow[] {
  // SAFETY: The SELECT list matches DashboardFacultyRow (user columns plus the left-joined report columns).
  return db.all(sql`
    SELECT u.id, u.name, u.email, r.status, r.completion, r.submitted_at
    FROM users u LEFT JOIN reports r ON r.faculty_id = u.id AND r.period_id = ${periodId}
    WHERE u.role = 'FACULTY' AND u.is_active = 1 ORDER BY u.name
  `) as DashboardFacultyRow[];
}

export function listTrends(opts: { facultyId?: string; departmentId?: string }, db: Db = defaultDb): TrendRow[] {
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
