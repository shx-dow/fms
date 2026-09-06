import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { reviewSchema } from '$lib/server/validation';
import { csvCell } from '$lib/server/csv';
import { computeWeekLabel } from '$lib/week-label';
import { listReviewQueue, getReviewScope, setReportStatus } from '$lib/server/db/repositories/reports';
import { insertReview } from '$lib/server/db/repositories/reviews';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const fmt = url.searchParams.get('format');
  const rows = listReviewQueue(locals.user.role === 'HOD' ? { departmentId: locals.user.departmentId ?? '' } : {});
  for (const r of rows) r.period_label = computeWeekLabel(String(r.period_starts_on));
  if (fmt === 'csv') {
    const header = 'Faculty,Email,Period,Status,Completion,Submitted At,Last Updated\n';
    const body = rows
      .map((r) =>
        [
          r.faculty_name,
          r.faculty_email,
          r.period_label,
          r.status,
          r.completion,
          r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
          new Date(r.updated_at).toISOString(),
        ]
          .map(csvCell)
          .join(','),
      )
      .join('\n');
    return new Response(header + body, {
      headers: {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="review-queue.csv"',
      },
    });
  }
  return json({ reports: rows });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Only HOD or Admin may review reports.' }, { status: 403 });

  const parsed = reviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  }
  const { reportId, decision, remarks } = parsed.data;
  const reviewerId = locals.user.id;
  const now = new Date().toISOString();
  const scope = locals.user.role === 'HOD' ? { departmentId: locals.user.departmentId ?? '' } : {};
  const allowed = getReviewScope(reportId, scope);
  if (!allowed) return json({ ok: false, error: 'Report is outside your review scope.' }, { status: 403 });
  setReportStatus(reportId, decision, now);
  insertReview({ id: randomUUID(), reportId, reviewerId, decision, remarks: remarks ?? null, createdAt: now });
  insertAuditEvent({ id: randomUUID(), actorId: reviewerId, action: decision, entityType: 'REPORT', entityId: reportId, createdAt: now });
  return json({ ok: true });
};
