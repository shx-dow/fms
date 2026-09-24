import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auditEvent, requireRole, requireUser } from '$lib/server/api';
import { departmentSchema } from '$lib/server/validation';
import { listDepartments, upsertDepartment } from '$lib/server/db/repositories/departments';

export const GET: RequestHandler = ({ locals }) => {
  requireRole(requireUser(locals), 'ADMIN');
  return json({ departments: listDepartments() });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireRole(requireUser(locals), 'ADMIN');
  const parsed = departmentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { id, code, name } = parsed.data;
  upsertDepartment(id, code, name);
  auditEvent(user.id, 'DEPARTMENT_UPDATED', 'DEPARTMENT', id);
  return json({ ok: true });
};
