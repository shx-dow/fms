import { randomUUID } from 'node:crypto';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { isReporter, reportStatusLabel } from '$lib/domain';
import { aggregateWeeks, facultyWeeks } from '$lib/dashboard-weeks';
import type { DashboardReportData } from '$lib/dashboard-types';
import { countActive } from '$lib/report-progress';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listAttachments } from '$lib/server/db/repositories/attachments';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, insertReportOrIgnore, listReportHistory, listReportsForPeriod } from '$lib/server/db/repositories/reports';
import type { Week } from '$lib/weeks';

export interface DashboardData {
  /** True for anyone who files a report: faculty and department heads. */
  isReporter: boolean;
  report: DashboardReportData | null;
  weeks: Week[];
  /** Department-level weeks, for a reviewer who also files a report. */
  departmentWeeks: Week[];
  /** The open week's department counts, so they are right on first paint. */
  departmentCounts: { awaiting: number; changes: number; approved: number };
}

const HISTORY_PREVIEW = 5;

export const load = (({ locals }: Parameters<PageServerLoad>[0]): DashboardData => {
  const user = locals.user;
  const files = isReporter(user?.role) && user ? ownReport(user) : null;
  const weeks = files ? facultyWeeks(user!.id) : [];
  // Only a department head has a department to review; faculty do not.
  const departmentWeeks = user?.role === 'HOD' ? aggregateWeeks(user) : [];

  // The reviewer counts used to arrive from a fetch after hydration, so they
  // rendered as zero until JavaScript ran.
  const openPeriod = ensureCurrentPeriod();
  const departmentReports = departmentWeeks.length
    ? listReportsForPeriod(openPeriod.id, { departmentId: user!.departmentId ?? '' })
    : [];

  return {
    isReporter: Boolean(files),
    report: files,
    weeks,
    departmentWeeks,
    departmentCounts: {
      awaiting: departmentReports.filter((r) => r.status === 'SUBMITTED').length,
      changes: departmentReports.filter((r) => r.status === 'CHANGES_REQUIRED').length,
      approved: departmentReports.filter((r) => r.status === 'APPROVED').length,
    },
  };
}) satisfies PageServerLoad;

/** The signed-in user's own report for the open period, created if absent.
 *
 * A department head teaches too, so this is the same report view a faculty
 * member gets. The dashboard is a report view, so an absent report is created
 * here rather than showing a dead end the user cannot act on. */
function ownReport(user: NonNullable<App.Locals['user']>): DashboardReportData | null {
  const period = ensureCurrentPeriod();
  const existing = getReportForPeriod(user.id, period.id);
  if (!existing) {
    const now = new Date().toISOString();
    insertReportOrIgnore({ id: randomUUID(), facultyId: user.id, periodId: period.id, createdAt: now, updatedAt: now });
  }
  const report = existing ?? getReportForPeriod(user.id, period.id);
  if (!report) return null;

  const reportId = String(report.id);
  const teaching = listTeaching(reportId);
  const scheduled = teaching.reduce((n, t) => n + Number(t.scheduled ?? 0), 0);
  const conducted = teaching.reduce((n, t) => n + Number(t.conducted ?? 0), 0);
  const syllabusValues = teaching.map((t) => Number(t.syllabus_completion ?? 0));

  return {
    reportId,
    periodLabel: computeWeekLabel(String(period.starts_on)),
    dueOn: String(period.due_on),
    // SAFETY: report.status is constrained to ReportStatus by the write path; unknown values fall back to the raw status.
    status: reportStatusLabel[report.status as keyof typeof reportStatusLabel] ?? report.status,
    completion: Number(report.completion ?? 0),
    scheduled,
    conducted,
    syllabus: syllabusValues.length ? Math.round(syllabusValues.reduce((a, b) => a + b, 0) / syllabusValues.length) : 0,
    researchCount: countActive(listResearch(reportId), (r) => r.title),
    dutiesCount: countActive(listDuties(reportId), (d) => d.name),
    outreachCount: countActive(listOutreach(reportId), (o) => o.activity),
    filesCount: listAttachments(reportId, user.id).length,
    hasTeaching: teaching.some((t) => Boolean(t.course_code?.trim() || t.course_name?.trim())),
    history: listReportHistory(user.id)
      .slice(0, HISTORY_PREVIEW)
      .map((h) => ({
        id: h.id,
        status: h.status,
        completion: h.completion,
        period_label: computeWeekLabel(String(h.starts_on)),
        period_id: h.period_id,
        updated_at: h.updated_at,
        submitted_at: h.submitted_at,
      })),
  };
}
