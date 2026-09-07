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
  setMustChangePassword,
  defaultDepartmentId,
} from '$lib/server/db/repositories/users';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';
import { deleteSessionsForUser } from '$lib/server/db/repositories/sessions';
import { PASSWORD_MIN_LENGTH, passwordTooShortMessage, setActiveSchema, createUserSchema, updateUserSchema } from '$lib/server/validation';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  return json({ users: listUsers() });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));

  const setActive = setActiveSchema.safeParse(body);
  if (setActive.success) {
    const { userId, isActive } = setActive.data;
    setUserActive(userId, isActive);
    if (!isActive) deleteSessionsForUser(userId);
    insertAuditEvent({
      id: randomUUID(),
      actorId: locals.user.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: userId,
      createdAt: new Date().toISOString(),
    });
    return json({ ok: true });
  }

  if (body.action === 'CREATE') {
    const created = createUserSchema.safeParse(body);
    if (!created.success)
      return json({ ok: false, error: 'Name, email, role and password are required.' }, { status: 400 });
    const { password, ...fields } = created.data;
    if (password.length < PASSWORD_MIN_LENGTH)
      return json({ ok: false, error: passwordTooShortMessage }, { status: 400 });
    const id = randomUUID();
    const defaultDept = defaultDepartmentId();
    createUser({
      id,
      name: fields.name,
      email: fields.email,
      employeeCode: fields.employeeCode || null,
      personalEmail: fields.personalEmail || null,
      mobile: fields.mobile || null,
      specialization: fields.specialization || null,
      role: fields.role,
      departmentId: fields.departmentId || defaultDept || null,
    });
    createCredentials(id, hashPassword(password));
    setMustChangePassword(id, true);
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
    const updated = updateUserSchema.safeParse(body);
    if (!updated.success)
      return json({ ok: false, error: 'User ID required.' }, { status: 400 });
    const { userId, password, ...fields } = updated.data;
    const updates: Parameters<typeof updateUser>[1] = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.email !== undefined) updates.email = fields.email;
    if (fields.employeeCode !== undefined) updates.employeeCode = fields.employeeCode ?? null;
    if (fields.personalEmail !== undefined) updates.personalEmail = fields.personalEmail ?? null;
    if (fields.mobile !== undefined) updates.mobile = fields.mobile ?? null;
    if (fields.specialization !== undefined) updates.specialization = fields.specialization ?? null;
    if (fields.role !== undefined) updates.role = fields.role;
    if (fields.departmentId !== undefined) updates.departmentId = fields.departmentId ?? null;
    updateUser(userId, updates);
    if (password) {
      if (password.length < PASSWORD_MIN_LENGTH)
        return json({ ok: false, error: passwordTooShortMessage }, { status: 400 });
      upsertCredentials(userId, hashPassword(password));
      setMustChangePassword(userId, true);
      deleteSessionsForUser(userId);
    }
    insertAuditEvent({
      id: randomUUID(),
      actorId: locals.user.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: userId,
      createdAt: new Date().toISOString(),
    });
    return json({ ok: true });
  }

  return json({ ok: false, error: 'Invalid action' }, { status: 400 });
};