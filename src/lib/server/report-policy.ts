import type { Db } from './db/client';
import { db as defaultDb } from './db/client';
import { getOwnerContext, getReportForUser } from './db/repositories/reports';
import { ensureCurrentPeriod } from './db/repositories/periods';

export function canAccessReport(
  user: { id: string; role: string; departmentId?: string },
  reportId: string,
  db: Db = defaultDb,
): boolean {
  const row = getOwnerContext(reportId, db);
  if (!row) return false;
  if (user.role === 'FACULTY') return row.faculty_id === user.id;
  if (user.role === 'HOD') return row.faculty_dept === (user.departmentId ?? '');
  return true;
}

export function canWriteReport(
  user: { id: string; role: string; departmentId?: string },
  reportId: string,
  db: Db = defaultDb,
  now = new Date(),
): boolean {
  if (user.role !== 'FACULTY') return false;
  const owned = getReportForUser(reportId, user.id, db);
  if (!owned) return false;
  return policyFor(owned, now, db).canEdit;
}

export function currentPeriod(db: Db = defaultDb) {
  return ensureCurrentPeriod(db);
}

export function policyFor(
  report: { status: string; reopened_until?: string | null },
  now = new Date(),
  db: Db = defaultDb,
) {
  const period = currentPeriod(db);
  const deadline = period ? new Date(period.due_on) : now;
  const reopened = report.reopened_until ? new Date(report.reopened_until) > now : false;
  const open = Boolean(period?.is_open) && now <= deadline;
  const locked = !['DRAFT', 'CHANGES_REQUIRED'].includes(report.status) && !reopened;
  return {
    period,
    open,
    locked,
    canEdit: (open && !locked) || reopened,
    deadline,
  };
}
