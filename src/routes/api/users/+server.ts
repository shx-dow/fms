import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import {
  listUsers,
  setUserActive,
  createUser,
  updateUser,
  createCredentials,
  upsertCredentials,
  defaultDepartmentId,
} from '$lib/server/db/repositories/users';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';
import { deleteSessionsForUser } from '$lib/server/db/repositories/sessions';
import { PASSWORD_MIN_LENGTH, passwordTooShortMessage } from '$lib/server/validation';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  return json({ users: listUsers() });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  const body = await request.json();

  if ('isActive' in body && body.userId) {
    if (typeof body.isActive !== 'boolean' || typeof body.userId !== 'string')
      return json({ ok: false, error: 'Invalid userId or isActive value.' }, { status: 400 });
    setUserActive(body.userId, body.isActive);
    if (!body.isActive) deleteSessionsForUser(body.userId);
    insertAuditEvent({
      id: randomUUID(),
      actorId: locals.user.id,
      action: body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: body.userId,
      createdAt: new Date().toISOString(),
    });
    return json({ ok: true });
  }

  if (body.action === 'CREATE') {
    if (!body.name || !body.email || !body.role || typeof body.password !== 'string')
      return json({ ok: false, error: 'Name, email, role and password are required.' }, { status: 400 });
    if (body.password.length < PASSWORD_MIN_LENGTH)
      return json({ ok: false, error: passwordTooShortMessage }, { status: 400 });
    const id = randomUUID();
    const defaultDept = defaultDepartmentId();
    createUser({ id, name: body.name, email: body.email, employeeCode: body.employeeCode || null, personalEmail: body.personalEmail || null, mobile: body.mobile || null, specialization: body.specialization || null, role: body.role, departmentId: body.departmentId || defaultDept || null });
    createCredentials(id, hashPassword(body.password));
    insertAuditEvent({
      id: randomUUID(),
      actorId: locals.user.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: id,
      createdAt: new Date().toISOString(),
    });
    return json({ ok: true, id });
  }

  if (body.action === 'UPDATE') {
    if (!body.userId) return json({ ok: false, error: 'User ID required.' }, { status: 400 });
    updateUser(body.userId, {
      ...(body.name ? { name: body.name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...('employeeCode' in body ? { employeeCode: body.employeeCode || null } : {}),
      ...('personalEmail' in body ? { personalEmail: body.personalEmail || null } : {}),
      ...('mobile' in body ? { mobile: body.mobile || null } : {}),
      ...('specialization' in body ? { specialization: body.specialization || null } : {}),
      ...(body.role ? { role: body.role } : {}),
      ...('departmentId' in body ? { departmentId: body.departmentId || null } : {}),
    });
    if (body.password !== undefined && body.password !== null && body.password !== '') {
      if (typeof body.password !== 'string' || body.password.length < PASSWORD_MIN_LENGTH)
        return json({ ok: false, error: passwordTooShortMessage }, { status: 400 });
      upsertCredentials(body.userId, hashPassword(body.password));
      deleteSessionsForUser(body.userId);
    }
    insertAuditEvent({
      id: randomUUID(),
      actorId: locals.user.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: body.userId,
      createdAt: new Date().toISOString(),
    });
    return json({ ok: true });
  }

  return json({ ok: false, error: 'Invalid action' }, { status: 400 });
};
