import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const params: unknown[] = [];
  let scope = '';
  if (locals.user.role === 'FACULTY') {
    scope = ' AND r.faculty_id = ?';
    params.push(locals.user.id);
  } else if (locals.user.role === 'HOD') {
    scope = ' AND u.department_id = ?';
    params.push(locals.user.departmentId ?? '');
  }

  const trends = sqlite
    .prepare(
      `SELECT p.starts_on, COUNT(r.id) AS total, SUM(CASE WHEN r.status IN ('SUBMITTED','APPROVED') THEN 1 ELSE 0 END) AS submitted, ROUND(AVG(r.completion), 0) AS avg_completion, ROUND(AVG(CASE WHEN r.status IN ('SUBMITTED','APPROVED') THEN 1 ELSE 0 END) * 100, 0) AS submission_rate FROM reporting_periods p LEFT JOIN reports r ON r.period_id = p.id LEFT JOIN users u ON u.id = r.faculty_id WHERE p.is_open = 0${scope} GROUP BY p.id ORDER BY p.starts_on DESC LIMIT 6`,
    )
    .all(...params) as Record<string, unknown>[];
  for (const t of trends) t.period = computeWeekLabel(String(t.starts_on));

  const currentParams: unknown[] = [];
  let deptFilter = '';
  if (locals.user.role === 'HOD') {
    deptFilter = ' AND u.department_id = ?';
    currentParams.push(locals.user.departmentId ?? '');
  }
  const current = sqlite
    .prepare(
      `SELECT p.starts_on, p.due_on, (SELECT COUNT(*) FROM users WHERE role = 'FACULTY' AND is_active = 1${locals.user.role === 'HOD' ? ' AND department_id = ?' : ''}) AS faculty_count, (SELECT COUNT(*) FROM reports r JOIN users u ON u.id = r.faculty_id WHERE r.period_id = p.id AND r.status IN ('SUBMITTED','APPROVED')${deptFilter}) AS submitted_count FROM reporting_periods p WHERE p.is_open = 1 LIMIT 1`,
    )
    .all(...(locals.user.role === 'HOD' ? [locals.user.departmentId ?? ''] : [])) as Record<string, unknown>[];
  if (current[0]) current[0].period = computeWeekLabel(String(current[0].starts_on));

  return json({ trends, currentPeriod: current[0] ?? null });
};