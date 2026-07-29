import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const scope = locals.user.role === 'FACULTY' ? ' AND r.faculty_id = ?' : locals.user.role === 'HOD' ? ' AND u.department_id = ?' : '';
  const params: any[] = [];
  if (locals.user.role === 'FACULTY') params.push(locals.user.id);
  else if (locals.user.role === 'HOD') params.push(locals.user.departmentId ?? '');
  const trends = sqlite.prepare(`SELECT p.label AS period, COUNT(r.id) AS total, SUM(CASE WHEN r.status IN ('SUBMITTED','APPROVED') THEN 1 ELSE 0 END) AS submitted, ROUND(AVG(r.completion), 0) AS avg_completion, ROUND(AVG(CASE WHEN r.status IN ('SUBMITTED','APPROVED') THEN 1 ELSE 0 END) * 100, 0) AS submission_rate FROM reporting_periods p LEFT JOIN reports r ON r.period_id = p.id LEFT JOIN users u ON u.id = r.faculty_id WHERE p.is_open = 0${scope} GROUP BY p.id ORDER BY p.starts_on DESC LIMIT 6`).all(...params);
  const current = sqlite.prepare("SELECT p.label AS period, p.due_on, (SELECT COUNT(*) FROM users WHERE role = 'FACULTY' AND is_active = 1${scope ? ' AND department_id = ?' : ''}) AS faculty_count, (SELECT COUNT(*) FROM reports r JOIN users u ON u.id = r.faculty_id WHERE r.period_id = p.id AND r.status IN ('SUBMITTED','APPROVED')${scope.replace('r.faculty_id', 'r.faculty_id').replace('u.department_id', 'u.department_id')}) AS submitted_count FROM reporting_periods p WHERE p.is_open = 1 LIMIT 1").all(...(locals.user.role === 'HOD' ? [locals.user.departmentId ?? ''] : []));
  return json({ trends, currentPeriod: current[0] ?? null });
};
