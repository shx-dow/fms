import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { listTrends, getCurrentPeriodStats } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const scope =
    locals.user.role === 'FACULTY'
      ? { facultyId: locals.user.id }
      : locals.user.role === 'HOD'
        ? { departmentId: locals.user.departmentId ?? '' }
        : {};
  const trends = listTrends(scope);
  for (const t of trends) t.period = computeWeekLabel(String(t.starts_on));

  const current = getCurrentPeriodStats(locals.user.role === 'HOD' ? { departmentId: locals.user.departmentId ?? '' } : {});
  if (current[0]) current[0].period = computeWeekLabel(String(current[0].starts_on));

  return json({ trends, currentPeriod: current[0] ?? null });
};
