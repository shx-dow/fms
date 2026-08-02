import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { getPeriod } from '$lib/server/db/repositories/periods';
import {
  getReportForPeriod,
  listReportsForPeriod,
  listWeeksAggregate,
  listWeeksForFaculty,
} from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const user = locals.user;
  const now = new Date();

  const periodId = url.searchParams.get('period');
  if (periodId) {
    const period = getPeriod(periodId);
    if (!period) return json({ error: 'Period not found' }, { status: 404 });
    const enriched = { ...period, week_label: computeWeekLabel(String(period.starts_on)) };
    if (user.role === 'FACULTY') {
      const report = getReportForPeriod(user.id, periodId);
      return json({ period: enriched, report: report ?? null });
    }
    const reports = listReportsForPeriod(periodId, {
      ...(user.role === 'HOD' ? { departmentId: user.departmentId ?? '' } : {}),
    });
    return json({ period: enriched, reports });
  }

  const raw =
    user.role === 'FACULTY'
      ? listWeeksForFaculty(user.id)
      : listWeeksAggregate({ ...(user.role === 'HOD' ? { departmentId: user.departmentId ?? '' } : {}) });

  const weeks = raw.map((w) => {
    const row: Record<string, unknown> = { ...w, week_label: computeWeekLabel(String(w.starts_on)) };
    if (user.role !== 'FACULTY') {
      const total = Number(w.total) || 1;
      const ratio = (Number(w.submitted) + Number(w.approved)) / total;
      row.level = Number(w.approved) === Number(w.total) ? 4 : ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : ratio > 0 ? 1 : 0;
      row.late = ratio < 1 && (!Number(w.is_open) || new Date(String(w.due_on)) < now) ? 1 : 0;
    }
    return row;
  });

  return json({ weeks });
};
