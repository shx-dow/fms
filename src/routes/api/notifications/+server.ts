import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const { id, role, departmentId } = locals.user;
  let whereClause: string;
  let params: string[];
  if (role === 'ADMIN') {
    whereClause = '1=1';
    params = [];
  } else if (role === 'HOD') {
    whereClause =
      "a.actor_id = ? OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT r.id FROM reports r JOIN users u ON u.id = r.faculty_id WHERE u.department_id = ?))";
    params = [id, departmentId ?? ''];
  } else {
    whereClause =
      "a.actor_id = ? OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT id FROM reports WHERE faculty_id = ?))";
    params = [id, id];
  }
  const events = sqlite
    .prepare(
      `SELECT a.id, a.action, a.entity_id, a.created_at, u.name AS actor_name, CASE WHEN nr.event_id IS NULL THEN 0 ELSE 1 END AS is_read FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id LEFT JOIN notification_reads nr ON nr.event_id = a.id AND nr.user_id = ? WHERE ${whereClause} ORDER BY a.created_at DESC LIMIT 30`,
    )
    .all(id, ...params);
  return json({ notifications: events });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  if (payload.eventId) {
    sqlite
      .prepare('INSERT OR REPLACE INTO notification_reads (user_id, event_id, read_at) VALUES (?, ?, ?)')
      .run(locals.user.id, String(payload.eventId), now);
  } else {
    const events = sqlite.prepare('SELECT id FROM audit_events').all() as {
      id: string;
    }[];
    const insert = sqlite.prepare(
      'INSERT OR REPLACE INTO notification_reads (user_id, event_id, read_at) VALUES (?, ?, ?)',
    );
    const markAll = sqlite.transaction(() => events.forEach((event) => insert.run(locals.user!.id, event.id, now)));
    markAll();
  }
  return json({ ok: true });
};
