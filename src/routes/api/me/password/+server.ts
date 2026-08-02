import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getPasswordHash, upsertCredentials } from '$lib/server/db/repositories/users';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!current || !next)
    return json({ ok: false, error: 'Current and new passwords are required.' }, { status: 400 });
  if (next.length < 4)
    return json({ ok: false, error: 'New password must be at least 4 characters.' }, { status: 400 });
  const cred = getPasswordHash(locals.user.id);
  if (!cred || !verifyPassword(current, cred.password_hash))
    return json({ ok: false, error: 'Current password is incorrect.' }, { status: 403 });
  upsertCredentials(locals.user.id, hashPassword(next));
  return json({ ok: true });
};
