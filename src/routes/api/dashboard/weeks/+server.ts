import { json } from '@sveltejs/kit';
import { api, requireUser} from '$lib/server/api';
import { aggregateWeeks, facultyWeeks } from '$lib/dashboard-weeks';
import { computeWeekLabel } from '$lib/week-label';
import { getPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, listReportsForPeriod } from '$lib/server/db/repositories/reports';
import { isReporter, isReviewer } from '$lib/domain';

export const GET = api(({ locals, url }) => {
  const user = requireUser(locals);
  const periodId = url.searchParams.get('period');
  // A department head files a report as well as reviewing the department, so the
  // caller states which view it wants. ADMIN has no report of their own, so an
  // "own" request from them falls back to the institute view.
  // FACULTY is pinned to their own report: they are never a reviewer, so
  // honouring scope=department would hand them every colleague's name, email,
  // completion and summary.
  const requested = url.searchParams.get('scope') ?? (isReporter(user.role) ? 'own' : 'department');
  const own = requested === 'own' && isReporter(user.role);
  const department = requested === 'department' && !own;
  // Only a reviewer or an admin may read a room full of other people's reports.
  if (department && !isReviewer(user.role) && user.role !== 'ADMIN') {
    return json({ error: 'Not allowed.' }, { status: 403 });
  }
  // HOD is confined to their own department. ADMIN is institute-wide by design.
  const scope = department && isReviewer(user.role) ? { departmentId: user.departmentId ?? '' } : {};

  if (periodId) {
    const period = getPeriod(periodId);
    if (!period) return json({ error: 'Period not found' }, { status: 404 });
    const enriched = { ...period, week_label: computeWeekLabel(String(period.starts_on)) };
    if (own) {
      return json({ period: enriched, report: getReportForPeriod(user.id, periodId) ?? null });
    }
    return json({ period: enriched, reports: listReportsForPeriod(periodId, scope) });
  }

  const weeks = own ? facultyWeeks(user.id) : aggregateWeeks(user);
  return json({ weeks });
});
