import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { canAccessReport } from '$lib/server/report-policy';
import { renderReportPdf } from '$lib/server/pdf';
import { getReportByIdForPdf } from '$lib/server/db/repositories/reports';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listReviewsForReport } from '$lib/server/db/repositories/reviews';
import { listAttachments } from '$lib/server/db/repositories/attachments';

export const GET: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) throw error(401, 'Sign in required');

  const reportId = params.id;
  const report = getReportByIdForPdf(reportId);
  if (!report) throw error(404, 'Report not found');
  report.period_label = computeWeekLabel(String(report.period_starts_on));

  if (!canAccessReport(locals.user, reportId)) throw error(403, 'Report is outside your scope.');

  const owner = String(report.faculty_id);
  const pdf = await renderReportPdf({
    report: {
      period_label: String(report.period_label),
      status: String(report.status ?? 'DRAFT'),
      faculty_name: String(report.faculty_name ?? '—'),
      faculty_email: String(report.faculty_email ?? '—'),
      department_name: String(report.department_name ?? '—'),
      completion: report.completion,
      submitted_at: report.submitted_at,
      summary: report.summary,
      challenges: report.challenges,
      next_goals: report.next_goals,
    },
    teaching: listTeaching(reportId),
    research: listResearch(reportId),
    duties: listDuties(reportId),
    outreach: listOutreach(reportId),
    reviews: listReviewsForReport(reportId),
    attachments: listAttachments(reportId, owner),
  });

  const filename = `weekly-report-${report.period_label.replace(/\s+/g, '-').toLowerCase() || 'report'}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
};
