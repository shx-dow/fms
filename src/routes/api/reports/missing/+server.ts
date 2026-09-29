import { json } from '@sveltejs/kit';
import { api, requireRole, requireUser } from '$lib/server/api';
import { REVIEWER_ROLES } from '$lib/domain';
import { readMissingPeriod } from '$lib/queue-filter';
import { computeWeekLabel } from '$lib/week-label';
import { csvCell } from '$lib/server/csv';
import { ensureCurrentPeriod, getPeriod } from '$lib/server/db/repositories/periods';
import { listMissing } from '$lib/server/db/repositories/reports';

export const GET = api(({ locals, url }) => {
  // Chasing missing forms is a department job, so this stays department-scoped.
  const user = requireRole(requireUser(locals), ...REVIEWER_ROLES, 'ADMIN');
  // An unknown week falls back to the open one rather than erroring, so a stale
  // bookmark still shows something useful.
  const requested = readMissingPeriod(url.searchParams);
  const period = (requested && getPeriod(requested)) || ensureCurrentPeriod();
  const periodLabel = computeWeekLabel(String(period.starts_on));
  const missing = listMissing(period.id, { departmentId: user.departmentId ?? '' });

  if (url.searchParams.get('format') === 'csv') {
    const header = 'Name,Email,Role,Department,Week\n';
    const body = missing
      .map((m) => [m.name, m.email, m.role, m.department_code ?? '', periodLabel].map(csvCell).join(','))
      .join('\n');
    return new Response(`${header}${body}\n`, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="not-submitted-${period.id}.csv"`,
      },
    });
  }
  return json({ missing, periodId: period.id, periodLabel });
});
