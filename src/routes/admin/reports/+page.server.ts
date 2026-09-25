import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { reviewScope } from '$lib/server/api';
import { listReviewQueue, type ReviewQueueRow } from '$lib/server/db/repositories/report-review';

export interface ReviewQueueData {
  reports: (ReviewQueueRow & { period_label: string })[];
}

export const load = (({ locals }: Parameters<PageServerLoad>[0]): ReviewQueueData => {
  const user = locals.user;
  if (!user) throw error(401, 'Sign in required');
  if (user.role !== 'HOD' && user.role !== 'ADMIN') throw error(403, 'Only HOD or Admin may review reports.');

  return {
    reports: listReviewQueue(reviewScope(user)).map((row) => ({
      ...row,
      period_label: computeWeekLabel(String(row.period_starts_on)),
    })),
  };
}) satisfies PageServerLoad;
