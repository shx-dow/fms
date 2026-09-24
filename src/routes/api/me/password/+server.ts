import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auditEvent, requireUser } from '$lib/server/api';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getPasswordHash, upsertCredentials, setMustChangePassword } from '$lib/server/db/repositories/users';
import { deleteSessionsForUserExcept } from '$lib/server/db/repositories/sessions';
import { passwordChangeSchema } from '$lib/server/validation';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const user = requireUser(locals);
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
  const cred = getPasswordHash(user.id);
  if (!cred || !verifyPassword(current, cred.password_hash))
    return json({ ok: false, error: 'Invalid credentials.' }, { status: 400 });
  upsertCredentials(user.id, hashPassword(next));
  setMustChangePassword(user.id, false);
  deleteSessionsForUserExcept(user.id, cookies.get('session') ?? '');
  auditEvent(user.id, 'PASSWORD_CHANGED', 'USER', user.id);
  return json({ ok: true });
};
