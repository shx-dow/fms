import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { getLatestReportWithFaculty, getReportByIdWithFaculty, getReviewScope } from '$lib/server/db/repositories/reports';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listReviewsForReport } from '$lib/server/db/repositories/reviews';

export const load: PageServerLoad = ({ locals, url }) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const requestedId = url.searchParams.get('id');
  const report = requestedId ? getReportByIdWithFaculty(requestedId) : getLatestReportWithFaculty(locals.user.id);
  if (!report) throw error(404, 'Report not found');
  if (locals.user.role === 'FACULTY' && report.faculty_id !== locals.user.id)
    throw error(403, 'Forbidden');
  if (locals.user.role === 'HOD') {
    const allowed = getReviewScope(String(report.id), { departmentId: locals.user.departmentId ?? '' });
    if (!allowed) throw error(403, 'Report is outside your review scope.');
  }
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
