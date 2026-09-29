import { json } from '@sveltejs/kit';
import { api, requireUser} from '$lib/server/api';
import { aggregateWeeks, facultyWeeks } from '$lib/dashboard-weeks';
import { computeWeekLabel } from '$lib/week-label';
import { getPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, listReportsForPeriod } from '$lib/server/db/repositories/reports';
import { isReporter } from '$lib/domain';

export const GET = api(({ locals, url }) => {
  const user = requireUser(locals);
  const periodId = url.searchParams.get('period');
  // A department head files a report as well as reviewing the department, so the
  // caller states which view it wants. ADMIN has no report of their own, so an
  // "own" request from them falls back to the department view.
  const scope = url.searchParams.get('scope') ?? (isReporter(user.role) ? 'own' : 'department');
  const own = scope === 'own' && isReporter(user.role);

  if (periodId) {
    const period = getPeriod(periodId);
    if (!period) return json({ error: 'Period not found' }, { status: 404 });
    const enriched = { ...period, week_label: computeWeekLabel(String(period.starts_on)) };
    if (own) {
      return json({ period: enriched, report: getReportForPeriod(user.id, periodId) ?? null });
    }
    return json({ period: enriched, reports: listReportsForPeriod(periodId, {}) });
  }

  const weeks = own ? facultyWeeks(user.id) : aggregateWeeks(user);
  return json({ weeks });
});
