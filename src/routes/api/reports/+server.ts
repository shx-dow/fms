import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { policyFor } from '$lib/server/report-policy';
import { ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
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
import { listTeaching, listResearch, listDuties, listOutreach, cloneTeachingIntoReport } from '$lib/server/db/repositories/activity';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const userId = locals.user.id;
  const period = ensureCurrentPeriod();
  if (!period) return json({ error: 'No open reporting period.' }, { status: 409 });
  let report = getReportForPeriod(userId, period.id);
  if (!report) {
    const now = new Date().toISOString();
    const id = randomUUID();
    try {
      insertReport({ id, facultyId: userId, periodId: period.id, createdAt: now, updatedAt: now });
    } catch {
      // Concurrent request won the auto-create race (unique faculty+period); fall through to re-select.
    }
    const created = getReportForPeriod(userId, period.id) ?? getReportById(id);
    if (!created) throw new Error('Failed to load created report');
    report = created;
  }
  const periodLabel = computeWeekLabel(String(report.period_starts_on));
  report.period_label = periodLabel;
  const history = listReportHistory(userId);
  for (const h of history) h.period_label = computeWeekLabel(String(h.starts_on));
  let teaching = listTeaching(String(report.id));
  if (!teaching.length) {
    const prev = history.find((h) => h.id !== String(report.id));
    if (prev) {
      const prevTeaching = listTeaching(String(prev.id));
      if (prevTeaching.length) {
        cloneTeachingIntoReport(String(report.id), prevTeaching);
        teaching = listTeaching(String(report.id));
      }
    }
  }
  return json({
    report,
    reports: history,
    policy: policyFor(report),
    teaching,
    research: listResearch(String(report.id)),
    duties: listDuties(String(report.id)),
    outreach: listOutreach(String(report.id)),
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const userId = locals.user.id;
  const period = ensureCurrentPeriod();
  if (!period) return json({ ok: false, error: 'No open reporting period.' }, { status: 409 });

  const parsed = reportSaveSchema.safeParse(await request.json().catch(() => ({})));
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
      { ok: false, error: 'This report is closed or locked. Request an authorized reopening.', code: 'REPORT_LOCKED' },
      { status: 403 },
    );

  saveReport({
    reportId,
    userId,
    now,
    summary: payload.summary ?? null,
    challenges: payload.challenges ?? null,
    nextGoals: payload.nextGoals ?? null,
    completion: payload.completion,
    status: payload.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
    teaching: payload.teaching ?? [],
  });
  return json({ ok: true, reportId });
};
