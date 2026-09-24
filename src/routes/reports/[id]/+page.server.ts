import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { canAccessReport } from '$lib/server/report-policy';
import { computeWeekLabel } from '$lib/week-label';
import { getReportByIdWithFaculty } from '$lib/server/db/repositories/reports';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listReviewsForReport } from '$lib/server/db/repositories/reviews';

export const load: PageServerLoad = ({ locals, params }) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const report = getReportByIdWithFaculty(params.id);
  if (!report) throw error(404, 'Report not found');
  if (!canAccessReport(locals.user, params.id)) throw error(403, 'Report is outside your scope.');
  report.period_label = computeWeekLabel(String(report.period_starts_on));
  return {
    report,
    teaching: listTeaching(params.id),
    research: listResearch(params.id),
    duties: listDuties(params.id),
    outreach: listOutreach(params.id),
    reviews: listReviewsForReport(params.id),
  };
};
