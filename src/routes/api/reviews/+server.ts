import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { api, auditEvent, forbidden, requireRole, requireUser } from '$lib/server/api';
import { REVIEWER_ROLES } from '$lib/domain';
import { readQueueFilters } from '$lib/queue-filter';
import { reviewSchema } from '$lib/server/validation';
import { csvCell } from '$lib/server/csv';
import { computeWeekLabel } from '$lib/week-label';
import { listReviewQueue, getReviewScope, setReportStatus } from '$lib/server/db/repositories/reports';
import { insertReview } from '$lib/server/db/repositories/reviews';

function csvResponse(rows: ReturnType<typeof listReviewQueue>, filename: string): Response {
  const header = 'Faculty,Email,Week,Status,Completion,Submitted At,Last Updated\n';
  const body = rows
    .map((r) =>
      [
        r.faculty_name,
        r.faculty_email,
        r.period_label ?? '',
        r.status,
        r.completion,
        r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
        new Date(r.updated_at).toISOString(),
      ]
        .map(csvCell)
        .join(','),
    )
    .join('\n');
  return new Response(`${header}${body}\n`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}

export const GET = api(({ locals, url }) => {
  // The guard is the point: only a department head reaches the queue.
  requireRole(requireUser(locals), ...REVIEWER_ROLES);
  const filters = readQueueFilters(url.searchParams);
  // The same filters drive the table and the download, so they cannot disagree.
  const rows = listReviewQueue({
    periodId: filters.period || undefined,
    statuses: filters.status ? [filters.status] : undefined,
    search: filters.q || undefined,
  });
  for (const r of rows) r.period_label = computeWeekLabel(String(r.period_starts_on));

  if (url.searchParams.get('format') === 'csv') {
    const name = filters.period || (filters.status ? filters.status.toLowerCase() : 'all');
    return csvResponse(rows, `review-queue-${name}.csv`);
  }
  return json({ reports: rows, filters });
});

export const POST = api(async ({ request, locals }) => {
  const user = requireRole(requireUser(locals), ...REVIEWER_ROLES);

  const parsed = reviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  }
  const { reportId, decision, remarks } = parsed.data;
  const reviewerId = user.id;
  const now = new Date().toISOString();
  const allowed = getReviewScope(reportId);
  if (!allowed) return forbidden('Report is outside your review scope.');
  setReportStatus(reportId, decision, now);
  insertReview({ id: randomUUID(), reportId, reviewerId, decision, remarks: remarks ?? null, createdAt: now });
  auditEvent(reviewerId, decision, 'REPORT', reportId);
  return json({ ok: true });
});
