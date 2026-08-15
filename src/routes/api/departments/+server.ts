import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { departmentSchema } from '$lib/server/validation';
import { listDepartments, upsertDepartment } from '$lib/server/db/repositories/departments';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage departments.' }, { status: 403 });
  return json({ departments: listDepartments() });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage departments.' }, { status: 403 });
  const parsed = departmentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { id, code, name } = parsed.data;
  upsertDepartment(id, code, name);
  insertAuditEvent({
    id: randomUUID(),
    actorId: locals.user.id,
    action: 'DEPARTMENT_UPDATED',
    entityType: 'DEPARTMENT',
    entityId: id,
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true });
};
