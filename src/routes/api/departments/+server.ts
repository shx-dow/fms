import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage departments.' }, { status: 403 });
  return json({
    departments: sqlite
      .prepare(
        'SELECT d.*, COUNT(u.id) AS member_count FROM departments d LEFT JOIN users u ON u.department_id = d.id GROUP BY d.id ORDER BY d.name',
      )
      .all(),
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may manage departments.' }, { status: 403 });
  const { id, code, name } = await request.json();
  if (!id || !code || !name)
    return json({ ok: false, error: 'Department code and name are required.' }, { status: 400 });
  sqlite
    .prepare(
      'INSERT INTO departments (id, code, name) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code, name=excluded.name',
    )
    .run(id, code, name);
  sqlite
    .prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), locals.user.id, 'DEPARTMENT_UPDATED', 'DEPARTMENT', id, new Date().toISOString());
  return json({ ok: true });
};
