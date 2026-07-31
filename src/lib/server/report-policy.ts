import { sqlite } from './local-db';

export function canAccessReport(
  user: { id: string; role: string; departmentId?: string },
  reportId: string,
): boolean {
  const row = sqlite
    .prepare(
      'SELECT r.faculty_id, u.department_id AS faculty_dept FROM reports r JOIN users u ON u.id = r.faculty_id WHERE r.id = ?',
    )
    .get(reportId) as { faculty_id: string; faculty_dept: string | null } | undefined;
  if (!row) return false;
  if (user.role === 'FACULTY') return row.faculty_id === user.id;
  if (user.role === 'HOD') return row.faculty_dept === (user.departmentId ?? '');
  return true;
}

export function currentPeriod() {
  return sqlite.prepare('SELECT * FROM reporting_periods WHERE is_open = 1 ORDER BY starts_on DESC LIMIT 1').get() as
    | {
        id: string;
        label: string;
        starts_on: string;
        ends_on: string;
        due_on: string;
        is_open: number;
      }
    | undefined;
}
export function policyFor(report: { status: string; reopened_until?: string | null }, now = new Date()) {
  const period = currentPeriod();
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
