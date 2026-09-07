import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getPasswordHash, upsertCredentials, setMustChangePassword } from '$lib/server/db/repositories/users';
import { deleteSessionsForUserExcept } from '$lib/server/db/repositories/sessions';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';
import { passwordChangeSchema } from '$lib/server/validation';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success)
    return json({ ok: false, error: 'Current and new passwords are required.' }, { status: 400 });
  const current = parsed.data.currentPassword;
  const next = parsed.data.newPassword;
  const cred = getPasswordHash(locals.user.id);
  if (!cred || !verifyPassword(current, cred.password_hash))
    return json({ ok: false, error: 'Invalid credentials.' }, { status: 400 });
  upsertCredentials(locals.user.id, hashPassword(next));
  setMustChangePassword(locals.user.id, false);
  deleteSessionsForUserExcept(locals.user.id, cookies.get('session') ?? '');
  insertAuditEvent({
    id: randomUUID(),
    actorId: locals.user.id,
    action: 'PASSWORD_CHANGED',
    entityType: 'USER',
    entityId: locals.user.id,
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true });
};
