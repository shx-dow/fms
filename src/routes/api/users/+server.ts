import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sqlite } from '$lib/server/local-db';
import { hashPassword } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  const rows = sqlite
    .prepare(
      'SELECT u.id, u.name, u.email, u.role, u.department_id, u.is_active, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id ORDER BY u.name',
    )
    .all() as { id: string; name: string; email: string; role: string; department_id: string | null; is_active: number; department_name: string | null }[];
  return json({ users: rows });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage users.' }, { status: 403 });
  const body = await request.json();

  if ('isActive' in body && body.userId) {
    if (typeof body.isActive !== 'boolean' || typeof body.userId !== 'string')
      return json({ ok: false, error: 'Invalid userId or isActive value.' }, { status: 400 });
    sqlite.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(body.isActive ? 1 : 0, body.userId);
    sqlite
      .prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), locals.user.id, body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'USER', body.userId, new Date().toISOString());
    return json({ ok: true });
  }

  if (body.action === 'CREATE') {
    if (!body.name || !body.email || !body.role || !body.password)
      return json({ ok: false, error: 'Name, email, role and password are required.' }, { status: 400 });
    const id = randomUUID();
    sqlite
      .prepare('INSERT INTO users (id, name, email, role, department_id, is_active) VALUES (?, ?, ?, ?, ?, 1)')
      .run(id, body.name, body.email, body.role, body.departmentId || null);
    sqlite
      .prepare('INSERT INTO credentials (user_id, password_hash) VALUES (?, ?)')
      .run(id, hashPassword(body.password));
    sqlite
      .prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), locals.user.id, 'USER_CREATED', 'USER', id, new Date().toISOString());
    return json({ ok: true, id });
  }

  if (body.action === 'UPDATE') {
    if (!body.userId) return json({ ok: false, error: 'User ID required.' }, { status: 400 });
    const updates: string[] = [];
    const params: unknown[] = [];
    if (body.name) { updates.push('name = ?'); params.push(body.name); }
    if (body.email) { updates.push('email = ?'); params.push(body.email); }
    if (body.role) { updates.push('role = ?'); params.push(body.role); }
    if ('departmentId' in body) { updates.push('department_id = ?'); params.push(body.departmentId || null); }
    if (updates.length) {
      params.push(body.userId);
      sqlite.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    if (body.password) {
      sqlite.prepare('INSERT OR REPLACE INTO credentials (user_id, password_hash) VALUES (?, ?)').run(body.userId, hashPassword(body.password));
    }
    sqlite
      .prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), locals.user.id, 'USER_UPDATED', 'USER', body.userId, new Date().toISOString());
    return json({ ok: true });
  }

  return json({ ok: false, error: 'Invalid action' }, { status: 400 });
};
