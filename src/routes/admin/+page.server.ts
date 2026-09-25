import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { reviewScope } from '$lib/server/api';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { listMissing, listReviewQueue, type MissingFacultyRow, type ReviewQueueRow } from '$lib/server/db/repositories/report-review';
import {
  getCurrentPeriodStats,
  listDashboardFaculty,
  listTrends,
  type DashboardFacultyRow,
  type TrendRow,
} from '$lib/server/db/repositories/report-trends';
import { listAuditEvents } from '$lib/server/db/repositories/audit';

export interface AdminOverviewData {
  role: 'HOD' | 'ADMIN';
  periodLabel: string;
  facultyCount: number;
  submittedCount: number;
  queue: (ReviewQueueRow & { period_label: string })[];
  missing: MissingFacultyRow[];
  trends: (TrendRow & { period: string })[];
  rateDelta: number | null;
  facultyStatus: DashboardFacultyRow[];
  auditEvents: { id: string; action: string; created_at: string; actor_name: string | null }[];
}

const RATE_DELTA_WINDOW = 2;

export const load = (({ locals }: Parameters<PageServerLoad>[0]): AdminOverviewData => {
  const user = locals.user;
  if (!user) throw error(401, 'Sign in required');
  if (user.role !== 'ADMIN' && user.role !== 'HOD') throw error(403, 'Only HOD or Admin may view this page.');

  const scope = reviewScope(user);
  const period = ensureCurrentPeriod();
  const periodLabel = computeWeekLabel(String(period.starts_on));

  const trends = listTrends(scope).map((t) => ({ ...t, period: computeWeekLabel(String(t.starts_on)) }));

  const [current] = getCurrentPeriodStats(scope);
  if (current) current.period = computeWeekLabel(String(current.starts_on));

  const queue = listReviewQueue(scope).map((row) => ({
    ...row,
    period_label: computeWeekLabel(String(row.period_starts_on)),
  }));

  return {
    role: user.role,
    periodLabel,
    facultyCount: current?.faculty_count ?? 0,
    submittedCount: current?.submitted_count ?? 0,
    queue,
    missing: listMissing(period.id, scope),
    trends,
    rateDelta:
      trends.length >= RATE_DELTA_WINDOW
        ? Number(trends[0].submission_rate ?? 0) - Number(trends[RATE_DELTA_WINDOW - 1].submission_rate ?? 0)
        : null,
    facultyStatus: user.role === 'ADMIN' ? listDashboardFaculty(period.id) : [],
    auditEvents: user.role === 'ADMIN' ? listAuditEvents({ limit: 8, offset: 0 }).events : [],
  };
}) satisfies PageServerLoad;
