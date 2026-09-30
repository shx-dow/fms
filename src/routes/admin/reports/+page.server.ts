import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { isReviewer } from '$lib/domain';
import { readQueueFilters } from '$lib/queue-filter';
import { listPeriods } from '$lib/server/db/repositories/periods';
import { listReviewQueue, type ReviewQueueRow } from '$lib/server/db/repositories/report-review';

export interface ReviewQueueData {
  reports: (ReviewQueueRow & { period_label: string })[];
  filters: ReturnType<typeof readQueueFilters>;
  periods: { id: string; label: string; isOpen: number }[];
}

export const load = (({ locals, url }: Parameters<PageServerLoad>[0]): ReviewQueueData => {
  const user = locals.user;
  if (!user) throw error(401, 'Sign in required');
  // Reviewing is a teaching-side job, so ADMIN is not admitted here even
  // though it can read a report elsewhere to diagnose a problem.
  if (!isReviewer(user.role)) throw error(403, 'Only a department head may review reports.');

  // Filters arrive in the URL, so the table, the download link and a shared or
  // bookmarked link all describe the same set of reports.
  const filters = readQueueFilters(url.searchParams);
  const reports = listReviewQueue({
    periodId: filters.period || undefined,
    statuses: filters.status ? [filters.status] : undefined,
    search: filters.q || undefined,
  }).map((row) => ({ ...row, period_label: computeWeekLabel(String(row.period_starts_on)) }));

  return {
    reports,
    filters,
    periods: listPeriods().map((p) => ({
      id: p.id,
      label: computeWeekLabel(String(p.starts_on)),
      isOpen: p.is_open,
    })),
  };
}) satisfies PageServerLoad;
