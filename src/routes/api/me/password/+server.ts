import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getPasswordHash, upsertCredentials } from '$lib/server/db/repositories/users';
import { deleteSessionsForUserExcept } from '$lib/server/db/repositories/sessions';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';
import { PASSWORD_MIN_LENGTH, passwordTooShortMessage } from '$lib/server/validation';

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string(),
});

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json({ ok: false, error: 'Current and new passwords are required.' }, { status: 400 });
  const current = parsed.data.currentPassword;
  const next = parsed.data.newPassword;
  if (!current || !next)
    return json({ ok: false, error: 'Current and new passwords are required.' }, { status: 400 });
  if (next.length < PASSWORD_MIN_LENGTH)
    return json({ ok: false, error: passwordTooShortMessage }, { status: 400 });
  const cred = getPasswordHash(locals.user.id);
  if (!cred || !verifyPassword(current, cred.password_hash))
    return json({ ok: false, error: 'Current password is incorrect.' }, { status: 403 });
  upsertCredentials(locals.user.id, hashPassword(next));
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
