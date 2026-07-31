import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const period = sqlite
    .prepare('SELECT * FROM reporting_periods WHERE is_open = 1 ORDER BY starts_on DESC LIMIT 1')
    .get() as { id: string; label: string; starts_on: string } | undefined;
  if (!period) return json({ missing: [] });
  const scope = locals.user.role === 'HOD' ? ' AND u.department_id = ?' : '';
  const params: any[] = [period.id];
  if (locals.user.role === 'HOD') params.push(locals.user.departmentId ?? '');
  const missing = sqlite
    .prepare(
      `SELECT u.id, u.name, u.email FROM users u WHERE u.role = 'FACULTY' AND u.is_active = 1${scope} AND u.id NOT IN (SELECT r.faculty_id FROM reports r WHERE r.period_id = ? AND r.status IN ('SUBMITTED', 'APPROVED'))`,
    )
    .all(...params);
  return json({ missing, periodLabel: computeWeekLabel(period.starts_on) });
};
