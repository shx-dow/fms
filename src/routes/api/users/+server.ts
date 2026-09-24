import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { auditEvent, requireRole, requireUser } from '$lib/server/api';
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
import { deleteSessionsForUser } from '$lib/server/db/repositories/sessions';
import { PASSWORD_MIN_LENGTH, passwordTooShortMessage, setActiveSchema, createUserSchema, updateUserSchema } from '$lib/server/validation';

export const GET: RequestHandler = ({ locals }) => {
  requireRole(requireUser(locals), 'ADMIN');
  return json({ users: listUsers() });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireRole(requireUser(locals), 'ADMIN');
  const body = await request.json().catch(() => ({}));

  const setActive = setActiveSchema.safeParse(body);
  if (setActive.success) {
    const { userId, isActive } = setActive.data;
    setUserActive(userId, isActive);
    if (!isActive) deleteSessionsForUser(userId);
    auditEvent(user.id, isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'USER', userId);
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
    auditEvent(user.id, 'USER_CREATED', 'USER', id);
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
    auditEvent(user.id, 'USER_UPDATED', 'USER', userId);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'Invalid action' }, { status: 400 });
};