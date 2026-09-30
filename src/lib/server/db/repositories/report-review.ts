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
  role: string;
  department_code: string | null;
}

export interface MissingScope {
  departmentId?: string;
}

export interface QueueFilters {
  /** Reporting week to narrow to; empty means every week. */
  periodId?: string;
  /** Only these statuses; empty means every reviewable status. */
  statuses?: readonly string[];
  /** Matched against the person's name, email and week label. */
  search?: string;
}

// The queue is institute-wide and includes the reviewer's own report: a
// department head may review anything, including their own, so it is unscoped.
export function listReviewQueue(filters: QueueFilters = {}, db: Db = defaultDb): ReviewQueueRow[] {
  const clauses: SQL[] = [];
  const statuses = filters.statuses?.length ? filters.statuses : ['SUBMITTED', 'CHANGES_REQUIRED', 'APPROVED'];
  clauses.push(sql`r.status IN (${sql.join(statuses.map((s) => sql`${s}`), sql`, `)})`);
  if (filters.periodId) clauses.push(sql`r.period_id = ${filters.periodId}`);
  if (filters.search) {
    const like = `%${filters.search.toLowerCase()}%`;
    clauses.push(sql`(LOWER(u.name) LIKE ${like} OR LOWER(u.email) LIKE ${like})`);
  }
  // SAFETY: The SELECT list matches ReviewQueueRow (report, user and period columns).
  return db.all(sql`
    SELECT r.id, r.status, r.updated_at, r.completion, r.submitted_at, u.name AS faculty_name,
           u.email AS faculty_email, p.starts_on AS period_starts_on
    FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id
    WHERE ${sql.join(clauses, sql` AND `)}
    ORDER BY r.updated_at DESC
  `) as ReviewQueueRow[];
}

/** Confirms the report exists. Every reviewer may act on any report. */
export function getReviewScope(reportId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list projects exactly the report id column.
  return db.get(sql`SELECT r.id FROM reports r WHERE r.id = ${reportId}`) as
    | { id: string }
    | undefined;
}

export function listMissing(periodId: string, opts: MissingScope, db: Db = defaultDb): MissingFacultyRow[] {
  const clauses: SQL[] = [
    // Everyone who teaches must file, so HODs count as missing too, not only faculty.
    sql`u.role IN ('FACULTY','HOD')`,
    sql`u.is_active = 1`,
    sql`u.id NOT IN (SELECT r.faculty_id FROM reports r WHERE r.period_id = ${periodId} AND r.status IN ('SUBMITTED', 'APPROVED'))`,
  ];
  if (opts.departmentId) clauses.push(sql`u.department_id = ${opts.departmentId}`);
  // SAFETY: The SELECT list projects exactly the columns named in MissingFacultyRow.
  return db.all(sql`
    SELECT u.id, u.name, u.email, u.role, d.code AS department_code
    FROM users u LEFT JOIN departments d ON d.id = u.department_id
    WHERE ${sql.join(clauses, sql` AND `)}
  `) as MissingFacultyRow[];
}
