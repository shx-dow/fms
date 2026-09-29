import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { api, auditEvent, forbidden, requireRole, requireUser } from '$lib/server/api';
import { reopenSchema } from '$lib/server/validation';
import { getReviewScope } from '$lib/server/db/repositories/reports';
import { reopenReport, insertException } from '$lib/server/db/repositories/exceptions';
import { REVIEWER_ROLES } from '$lib/domain';

export const POST = api(async ({ request, locals }) => {
  const user = requireRole(requireUser(locals), ...REVIEWER_ROLES);
  const parsed = reopenSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { reportId, reason, allowedUntil } = parsed.data;
  const allowed = getReviewScope(reportId);
  if (!allowed) return forbidden('Report is outside your review scope.');
  const now = new Date().toISOString();
  reopenReport({ reportId, allowedUntil, reason, updatedAt: now });
  insertException({ id: randomUUID(), reportId, actorId: user.id, reason, allowedUntil, createdAt: now });
  auditEvent(user.id, 'REPORT_REOPENED', 'REPORT', reportId);
  return json({ ok: true });
});
