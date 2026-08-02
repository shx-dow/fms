import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { listMissing } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const period = ensureCurrentPeriod();
  const missing = listMissing(period.id, {
    ...(locals.user.role === 'HOD' ? { departmentId: locals.user.departmentId ?? '' } : {}),
  });
  return json({ missing, periodLabel: computeWeekLabel(period.starts_on) });
};
