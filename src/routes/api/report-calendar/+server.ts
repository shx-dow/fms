import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sqlite } from '$lib/server/local-db';

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const day = url.searchParams.get('date');
  const clauses = ['r.status IN (\'SUBMITTED\', \'CHANGES_REQUIRED\', \'APPROVED\')'];
  const params: string[] = [];
  if (day) { clauses.push('substr(COALESCE(r.submitted_at, r.updated_at), 1, 10) = ?'); params.push(day); }
  if (locals.user.role === 'FACULTY') { clauses.push('r.faculty_id = ?'); params.push(locals.user.id); }
  if (locals.user.role === 'HOD') { clauses.push('u.department_id = ?'); params.push(locals.user.departmentId ?? ''); }
  const reports = sqlite.prepare(`SELECT r.id, r.status, r.completion, r.submitted_at, r.updated_at, u.name AS faculty_name, u.email AS faculty_email, p.label AS period_label FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id WHERE ${clauses.join(' AND ')} ORDER BY COALESCE(r.submitted_at, r.updated_at) DESC`).all(...params);
  return json({ reports });
};
