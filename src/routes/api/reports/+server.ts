import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { currentPeriod, policyFor } from '$lib/server/report-policy';
import { reportSaveSchema } from '$lib/server/validation';
import { computeWeekLabel } from '$lib/week-label';
import {
  getReportForPeriod,
  getReportById,
  insertReport,
  insertReportOrIgnore,
  getReportForUser,
  listReportHistory,
  saveReport,
} from '$lib/server/db/repositories/reports';
import { listTeaching, listResearch, listDuties, listOutreach } from '$lib/server/db/repositories/activity';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const userId = locals.user.id;
  const period = currentPeriod();
  if (!period) return json({ error: 'No open reporting period.' }, { status: 409 });
  let report = getReportForPeriod(userId, period.id);
  if (!report) {
    const now = new Date().toISOString();
    const id = randomUUID();
    insertReport({ id, facultyId: userId, periodId: period.id, createdAt: now, updatedAt: now });
    report = getReportById(id) as Record<string, unknown>;
  }
  const periodLabel = computeWeekLabel(String(report.period_starts_on));
  report.period_label = periodLabel;
  const history = listReportHistory(userId);
  for (const h of history) h.period_label = computeWeekLabel(String(h.starts_on));
  return json({
    report,
    reports: history,
    policy: policyFor(report as { status: string; reopened_until?: string | null }),
    teaching: listTeaching(String(report.id)),
    research: listResearch(String(report.id)),
    duties: listDuties(String(report.id)),
    outreach: listOutreach(String(report.id)),
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const userId = locals.user.id;
  const period = currentPeriod();
  if (!period) return json({ ok: false, error: 'No open reporting period.' }, { status: 409 });

  const parsed = reportSaveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  }
  const payload = parsed.data;

  const reportId = String(payload.reportId || randomUUID());
  const now = new Date().toISOString();
  insertReportOrIgnore({ id: reportId, facultyId: userId, periodId: period.id, createdAt: now, updatedAt: now });
  const existing = getReportForUser(reportId, userId);
  if (!existing) return json({ ok: false, error: 'Report not found' }, { status: 404 });
  const policy = policyFor(existing, new Date(now), undefined, existing);
  if (!policy.canEdit)
    return json(
      { ok: false, error: 'This report is closed or locked. Request an authorized reopening.' },
      { status: 423 },
    );

  saveReport({
    reportId,
    userId,
    now,
    summary: payload.summary ?? null,
    challenges: payload.challenges ?? null,
    nextGoals: payload.nextGoals ?? null,
    completion: Number(payload.completion ?? 0),
    status: payload.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
    teaching: payload.teaching ?? [],
  });
  return json({ ok: true, reportId });
};
