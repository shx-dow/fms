import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getPasswordHash, upsertCredentials } from '$lib/server/db/repositories/users';
import { deleteSessionsForUserExcept } from '$lib/server/db/repositories/sessions';
import { PASSWORD_MIN_LENGTH, passwordTooShortMessage } from '$lib/server/validation';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!current || !next)
    return json({ ok: false, error: 'Current and new passwords are required.' }, { status: 400 });
  if (next.length < PASSWORD_MIN_LENGTH)
    return json({ ok: false, error: passwordTooShortMessage }, { status: 400 });
  const cred = getPasswordHash(locals.user.id);
  if (!cred || !verifyPassword(current, cred.password_hash))
    return json({ ok: false, error: 'Current password is incorrect.' }, { status: 403 });
  upsertCredentials(locals.user.id, hashPassword(next));
  deleteSessionsForUserExcept(locals.user.id, cookies.get('session') ?? '');
  return json({ ok: true });
};
