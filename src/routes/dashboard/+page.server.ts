import { randomUUID } from 'node:crypto';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { reportStatusLabel } from '$lib/domain';
import { aggregateWeeks, facultyWeeks } from '$lib/dashboard-weeks';
import { countActive } from '$lib/report-progress';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';
import { listAttachments } from '$lib/server/db/repositories/attachments';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, insertReportOrIgnore, listReportHistory } from '$lib/server/db/repositories/reports';
import type { Week } from '$lib/weeks';

export interface DashboardReportData {
  reportId: string;
  periodLabel: string;
  dueOn: string;
  status: string;
  completion: number;
  scheduled: number;
  conducted: number;
  syllabus: number;
  researchCount: number;
  dutiesCount: number;
  outreachCount: number;
  filesCount: number;
  hasTeaching: boolean;
  history: {
    id: string;
    status: string;
    completion: number;
    period_label: string;
    period_id: string;
    updated_at: string;
    submitted_at: string | null;
  }[];
}

export interface DashboardData {
  isFaculty: boolean;
  report: DashboardReportData | null;
  weeks: Week[];
}

const HISTORY_PREVIEW = 5;

export const load = (({ locals }: Parameters<PageServerLoad>[0]): DashboardData => {
  const user = locals.user;
  const isFaculty = user?.role === 'FACULTY';
  const period = ensureCurrentPeriod();

  if (!isFaculty || !user) {
    return { isFaculty: false, report: null, weeks: aggregateWeeks(user ?? { role: '' }) };
  }

  const weeks = facultyWeeks(user.id);
  // The dashboard is a report view, so an absent report is created here rather
  // than showing a dead end the faculty member cannot act on.
  const existing = getReportForPeriod(user.id, period.id);
  if (!existing) insertReportOrIgnore({ id: randomUUID(), facultyId: user.id, periodId: period.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const report = existing ?? getReportForPeriod(user.id, period.id);
  if (!report) return { isFaculty: true, report: null, weeks };

  const reportId = String(report.id);
  const teaching = listTeaching(reportId);
  const scheduled = teaching.reduce((n, t) => n + Number(t.scheduled ?? 0), 0);
  const conducted = teaching.reduce((n, t) => n + Number(t.conducted ?? 0), 0);
  const syllabusValues = teaching.map((t) => Number(t.syllabus_completion ?? 0));

  return {
    isFaculty: true,
    weeks,
    report: {
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
    },
  };
}) satisfies PageServerLoad;
