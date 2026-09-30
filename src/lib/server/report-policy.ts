import type { Db } from './db/client';
import { db as defaultDb } from './db/client';
import { getOwnerContext, getReportForUser } from './db/repositories/reports';
import { ensureCurrentPeriod } from './db/repositories/periods';
import { isReporter } from '$lib/domain';

export function canAccessReport(
  user: { id: string; role: string; departmentId?: string },
  reportId: string,
  db: Db = defaultDb,
): boolean {
  const row = getOwnerContext(reportId, db);
  if (!row) return false;
  // The owner can always read their own report, whatever role they hold.
  if (row.faculty_id === user.id) return true;
  if (user.role === 'HOD') return row.faculty_dept === (user.departmentId ?? '');
  if (user.role === 'FACULTY') return false;
  return true;
}

export function canWriteReport(
  user: { id: string; role: string; departmentId?: string },
  reportId: string,
  db: Db = defaultDb,
  now = new Date(),
): boolean {
  // ADMIN reviews other people's reports and does not file one of their own.
  if (!isReporter(user.role)) return false;
  const owned = getReportForUser(reportId, user.id, db);
  if (!owned) return false;
  return policyFor(owned, now, db, owned).canEdit;
}

export function policyFor(
  report: { status: string; reopened_until?: string | null },
  now = new Date(),
  db: Db = defaultDb,
  period?: { due_on: string; is_open: number } | null,
) {
  const own = period ?? ensureCurrentPeriod(db);
  const deadline = own ? new Date(own.due_on) : now;
  const reopened = report.reopened_until ? new Date(report.reopened_until) > now : false;
  const open = Boolean(own?.is_open) && now <= deadline;
  const locked = !['DRAFT', 'CHANGES_REQUIRED'].includes(report.status) && !reopened;
  return {
    period: own,
    open,
    locked,
    canEdit: (open && !locked) || reopened,
    deadline,
  };
}
