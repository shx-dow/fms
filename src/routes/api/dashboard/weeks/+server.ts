import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { aggregateWeeks, facultyWeeks } from '$lib/dashboard-weeks';
import { computeWeekLabel } from '$lib/week-label';
import { getPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, listReportsForPeriod } from '$lib/server/db/repositories/reports';
import { reviewScope } from '$lib/server/api';

export const GET: RequestHandler = ({ locals, url }) => {
  const user = requireUser(locals);
  const periodId = url.searchParams.get('period');

  if (periodId) {
    const period = getPeriod(periodId);
    if (!period) return json({ error: 'Period not found' }, { status: 404 });
    const enriched = { ...period, week_label: computeWeekLabel(String(period.starts_on)) };
    if (user.role === 'FACULTY') {
      return json({ period: enriched, report: getReportForPeriod(user.id, periodId) ?? null });
    }
    return json({ period: enriched, reports: listReportsForPeriod(periodId, reviewScope(user)) });
  }

  const weeks = user.role === 'FACULTY' ? facultyWeeks(user.id) : aggregateWeeks(user);
  return json({ weeks });
};
