import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { getLatestReportWithFaculty } from '$lib/server/db/repositories/reports';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listReviewsForReport } from '$lib/server/db/repositories/reviews';

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const report = getLatestReportWithFaculty(locals.user.id);
  if (!report) throw error(404, 'Report not found');
  report.period_label = computeWeekLabel(String(report.period_starts_on));
  return {
    report,
    teaching: listTeaching(String(report.id)),
    research: listResearch(String(report.id)),
    duties: listDuties(String(report.id)),
    outreach: listOutreach(String(report.id)),
    reviews: listReviewsForReport(String(report.id)),
  };
};
