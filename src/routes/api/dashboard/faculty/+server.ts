import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole, requireUser } from '$lib/server/api';
import { computeWeekLabel } from '$lib/week-label';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { listDashboardFaculty } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  requireRole(requireUser(locals), 'ADMIN');
  const period = ensureCurrentPeriod();
  const faculty = listDashboardFaculty(period.id);
  return json({ faculty, periodLabel: computeWeekLabel(period.starts_on) });
};
