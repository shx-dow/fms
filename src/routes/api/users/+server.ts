import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  return json({ users: sqlite.prepare('SELECT u.id, u.name, u.email, u.role, u.department_id, u.is_active, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id ORDER BY u.name').all() });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  const { userId, isActive } = await request.json();
  if (!userId || typeof isActive !== 'boolean') return json({ ok: false, error: 'User and active state are required.' }, { status: 400 });
  sqlite.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, userId);
  sqlite.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), locals.user.id, isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'USER', userId, new Date().toISOString());
  return json({ ok: true });
};
