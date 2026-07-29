import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role)) return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  return json({ events: sqlite.prepare('SELECT a.*, u.name AS actor_name FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT 100').all() });
};
