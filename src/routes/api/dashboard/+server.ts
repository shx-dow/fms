import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { computeWeekLabel } from '$lib/week-label';
import { getLatestReportForUser, getTeachingStats } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  const user = requireUser(locals);
  const userId = user.id;
  const report = getLatestReportForUser(userId);
  if (!report)
    return json({
      report: null,
      stats: { scheduled: 0, conducted: 0, syllabus: 0 },
    });
  report.label = computeWeekLabel(String(report.starts_on));
  const stats = getTeachingStats(String(report.id));
  return json({ report, stats });
};
