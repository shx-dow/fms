import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { auditEvent, forbidden, requireRole, requireUser, reviewScope } from '$lib/server/api';
import { reopenSchema } from '$lib/server/validation';
import { getReviewScope } from '$lib/server/db/repositories/reports';
import { reopenReport, insertException } from '$lib/server/db/repositories/exceptions';

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireRole(requireUser(locals), 'HOD', 'ADMIN');
  const parsed = reopenSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { reportId, reason, allowedUntil } = parsed.data;
  const allowed = getReviewScope(reportId, reviewScope(user));
  if (!allowed) return forbidden('Report is outside your review scope.');
  const now = new Date().toISOString();
  reopenReport({ reportId, allowedUntil, reason, updatedAt: now });
  insertException({ id: randomUUID(), reportId, actorId: user.id, reason, allowedUntil, createdAt: now });
  auditEvent(user.id, 'REPORT_REOPENED', 'REPORT', reportId);
  return json({ ok: true });
};
