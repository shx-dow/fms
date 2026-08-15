import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { reopenSchema } from '$lib/server/validation';
import { getReviewScope } from '$lib/server/db/repositories/reports';
import { reopenReport, insertException } from '$lib/server/db/repositories/exceptions';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Only HOD or Admin may reopen a report.' }, { status: 403 });
  const parsed = reopenSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { reportId, reason, allowedUntil } = parsed.data;
  const scope = locals.user.role === 'HOD' ? { departmentId: locals.user.departmentId ?? '' } : {};
  const allowed = getReviewScope(reportId, scope);
  if (!allowed) return json({ ok: false, error: 'Report is outside your review scope.' }, { status: 403 });
  const now = new Date().toISOString();
  reopenReport({ reportId, allowedUntil, reason, updatedAt: now });
  insertException({ id: randomUUID(), reportId, actorId: locals.user.id, reason, allowedUntil, createdAt: now });
  insertAuditEvent({
    id: randomUUID(),
    actorId: locals.user.id,
    action: 'REPORT_REOPENED',
    entityType: 'REPORT',
    entityId: reportId,
    createdAt: now,
  });
  return json({ ok: true });
};
