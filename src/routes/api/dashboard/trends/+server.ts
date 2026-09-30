import { json } from '@sveltejs/kit';
import { api, requireRole, requireUser } from '$lib/server/api';
import { computeWeekLabel } from '$lib/week-label';
import { listTrends, getCurrentPeriodStats } from '$lib/server/db/repositories/reports';

export const GET = api(({ locals }) => {
  const user = requireUser(locals);
  // Submission counts are a department's business, not a colleague's. The
  // previous guard was requireUser alone, which let any faculty member read
  // institute-wide submitted/total figures. HOD sees their department, ADMIN
  // sees the institute, and everyone else is refused.
  requireRole(user, 'HOD', 'ADMIN');

  const departmentId = user.role === 'HOD' ? user.departmentId ?? '' : undefined;
  const trends = listTrends(departmentId ? { departmentId } : {});
  for (const t of trends) t.period = computeWeekLabel(String(t.starts_on));

  const current = getCurrentPeriodStats(departmentId ? { departmentId } : {});
  if (current[0]) current[0].period = computeWeekLabel(String(current[0].starts_on));

  return json({ trends, currentPeriod: current[0] ?? null });
});
