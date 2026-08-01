import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { currentOpenPeriod } from '$lib/server/db/repositories/periods';
import { listDashboardFaculty } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const period = currentOpenPeriod();
  const faculty = listDashboardFaculty(period?.id ?? null);
  return json({ faculty, periodLabel: period ? computeWeekLabel(period.starts_on) : null });
};
