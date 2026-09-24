import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser, reviewScope } from '$lib/server/api';
import { computeWeekLabel } from '$lib/week-label';
import { listTrends, getCurrentPeriodStats } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  const user = requireUser(locals);

  const scope =
    user.role === 'FACULTY'
      ? { facultyId: user.id }
      : reviewScope(user);
  const trends = listTrends(scope);
  for (const t of trends) t.period = computeWeekLabel(String(t.starts_on));

  const current = getCurrentPeriodStats(reviewScope(user));
  if (current[0]) current[0].period = computeWeekLabel(String(current[0].starts_on));

  return json({ trends, currentPeriod: current[0] ?? null });
};
