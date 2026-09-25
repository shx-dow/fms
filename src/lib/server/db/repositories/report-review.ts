import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

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
