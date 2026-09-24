import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole, requireUser, reviewScope } from '$lib/server/api';
import { computeWeekLabel } from '$lib/week-label';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { listMissing } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  const user = requireRole(requireUser(locals), 'HOD', 'ADMIN');
  const period = ensureCurrentPeriod();
  const missing = listMissing(period.id, reviewScope(user));
  return json({ missing, periodLabel: computeWeekLabel(period.starts_on) });
};
