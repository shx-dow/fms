import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const period = sqlite
    .prepare('SELECT id, starts_on FROM reporting_periods WHERE is_open = 1 ORDER BY starts_on DESC LIMIT 1')
    .get() as { id: string; starts_on: string } | undefined;
  const faculty = sqlite
    .prepare(
      `SELECT u.id, u.name, u.email, r.status, r.completion, r.submitted_at FROM users u LEFT JOIN reports r ON r.faculty_id = u.id AND r.period_id = ? WHERE u.role = 'FACULTY' AND u.is_active = 1 ORDER BY u.name`,
    )
    .all(period?.id ?? null);
  return json({ faculty, periodLabel: period ? computeWeekLabel(period.starts_on) : null });
};
