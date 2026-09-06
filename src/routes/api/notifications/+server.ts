import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { notificationUpdateSchema } from '$lib/server/validation';
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const payload = notificationUpdateSchema.parse(body);
  const now = new Date().toISOString();
  if (payload.eventId) {
    if (payload.unread) {
      markNotificationUnread(locals.user.id, payload.eventId);
    } else {
      markNotificationRead(locals.user.id, payload.eventId, now);
    }
  } else {
    markAllNotificationsRead(locals.user.id);
  }
  return json({ ok: true });
};
