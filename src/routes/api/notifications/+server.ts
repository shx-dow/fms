import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { notificationUpdateSchema } from '$lib/server/validation';
import {
  listNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
} from '$lib/server/db/repositories/audit';

export const GET: RequestHandler = ({ locals }) => {
  const user = requireUser(locals);
  const { id, role, departmentId } = user;
  return json({ notifications: listNotifications({ userId: id, role, departmentId }) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireUser(locals);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = notificationUpdateSchema.safeParse(body);
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 });
  const payload = parsed.data;
  const now = new Date().toISOString();
  if (payload.eventId) {
    if (payload.unread) {
      markNotificationUnread(user.id, payload.eventId);
    } else {
      markNotificationRead(user.id, payload.eventId, now);
    }
  } else {
    markAllNotificationsRead(user.id);
  }
  return json({ ok: true });
};
