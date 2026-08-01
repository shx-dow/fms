import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  listNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
} from '$lib/server/db/repositories/audit';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const { id, role, departmentId } = locals.user;
  return json({ notifications: listNotifications({ userId: id, role, departmentId }) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Sign in required' }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  if (payload.eventId) {
    if (payload.unread) {
      markNotificationUnread(locals.user.id, String(payload.eventId));
    } else {
      markNotificationRead(locals.user.id, String(payload.eventId), now);
    }
  } else {
    markAllNotificationsRead(locals.user.id);
  }
  return json({ ok: true });
};
