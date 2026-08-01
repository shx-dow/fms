import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAuditEvents } from '$lib/server/db/repositories/audit';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  return json({ events: listAuditEvents() });
};
