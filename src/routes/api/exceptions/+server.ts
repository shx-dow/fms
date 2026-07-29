import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Only HOD or Admin may reopen a report.' }, { status: 403 });
  const { reportId, reason, allowedUntil } = await request.json();
  if (!reportId || !reason || !allowedUntil)
    return json({ ok: false, error: 'Report, reason, and expiry are required.' }, { status: 400 });
  const now = new Date().toISOString();
  sqlite
    .prepare('UPDATE reports SET reopened_until = ?, reopen_reason = ?, updated_at = ? WHERE id = ?')
    .run(allowedUntil, reason, now, reportId);
  sqlite
    .prepare('INSERT INTO report_exceptions VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), reportId, locals.user.id, reason, allowedUntil, now);
  sqlite
    .prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), locals.user.id, 'REPORT_REOPENED', 'REPORT', reportId, now);
  return json({ ok: true });
};
