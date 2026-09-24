import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { canAccessReport } from '$lib/server/report-policy';
import { computeWeekLabel } from '$lib/week-label';
import { getReportByIdWithFaculty } from '$lib/server/db/repositories/reports';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listReviewsForReport } from '$lib/server/db/repositories/reviews';

export const GET: RequestHandler = ({ locals, params }) => {
  const user = requireUser(locals);
  const reportId = params.id;
  const report = getReportByIdWithFaculty(reportId);
  if (!report) return json({ error: 'Report not found' }, { status: 404 });
  report.period_label = computeWeekLabel(String(report.period_starts_on));
  if (!canAccessReport(user, reportId))
    return json({ error: 'Report is outside your scope.' }, { status: 403 });
  return json({
    report,
    teaching: listTeaching(reportId),
    research: listResearch(reportId),
    duties: listDuties(reportId),
    outreach: listOutreach(reportId),
    reviews: listReviewsForReport(reportId),
  });
};
