import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { getReportByIdWithFaculty, getReviewScope } from '$lib/server/db/repositories/reports';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listReviewsForReport } from '$lib/server/db/repositories/reviews';

export const GET: RequestHandler = ({ locals, params }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const reportId = params.id;
  const report = getReportByIdWithFaculty(reportId);
  if (!report) return json({ error: 'Report not found' }, { status: 404 });
  report.period_label = computeWeekLabel(String(report.period_starts_on));
  if (locals.user.role === 'FACULTY' && report.faculty_id !== locals.user.id)
    return json({ error: 'Forbidden' }, { status: 403 });
  if (locals.user.role === 'HOD') {
    const allowed = getReviewScope(reportId, { departmentId: locals.user.departmentId ?? '' });
    if (!allowed) return json({ error: 'Report is outside your review scope.' }, { status: 403 });
  }
  return json({
    report,
    teaching: listTeaching(reportId),
    research: listResearch(reportId),
    duties: listDuties(reportId),
    outreach: listOutreach(reportId),
    reviews: listReviewsForReport(reportId),
  });
};
