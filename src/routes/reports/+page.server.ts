import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { reportStatusLabel } from '$lib/domain';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, listReportHistory, type ReportHistoryRow } from '$lib/server/db/repositories/reports';

export interface ReportHistoryData {
  currentPeriodLabel: string;
  currentStatus: string | null;
  reports: (ReportHistoryRow & { period_label: string })[];
}

export const load = (( { locals }: Parameters<PageServerLoad>[0]): ReportHistoryData => {
  // The route guard already redirects non-faculty; this keeps the page's own contract explicit.
  const user = locals.user;
  if (!user) throw error(401, 'Sign in required');
  if (user.role !== 'FACULTY') throw error(403, 'Only faculty can view their report history.');

  const period = ensureCurrentPeriod();
  const current = getReportForPeriod(user.id, period.id);
  const reports = listReportHistory(user.id).map((row) => ({
    ...row,
    period_label: computeWeekLabel(String(row.starts_on)),
  }));

  return {
    currentPeriodLabel: computeWeekLabel(String(period.starts_on)),
    // SAFETY: report.status is constrained to ReportStatus by the write path; unknown values fall back to the raw status.
    currentStatus: current ? reportStatusLabel[current.status as keyof typeof reportStatusLabel] ?? current.status : null,
    reports,
  };
}) satisfies PageServerLoad;
