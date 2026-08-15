import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface AuditEventRow {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  actor_name: string | null;
  _total: number;
}

export interface AuditEventsResult {
  events: Omit<AuditEventRow, '_total'>[];
  total: number;
}

export function insertAuditEvent(
  fields: { id: string; actorId: string; action: string; entityType: string; entityId: string; createdAt: string },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO audit_events VALUES (${fields.id}, ${fields.actorId}, ${fields.action}, ${fields.entityType}, ${fields.entityId}, ${fields.createdAt})
  `);
}

export function listAuditEvents(
  opts: { search?: string; action?: string; from?: string; to?: string; limit: number; offset: number },
  db: Db = defaultDb,
): AuditEventsResult {
  const where: SQL[] = [];
  if (opts.search) where.push(sql`(u.name LIKE ${'%' + opts.search + '%'} OR a.actor_id LIKE ${'%' + opts.search + '%'})`);
  if (opts.action) where.push(sql`a.action = ${opts.action}`);
  if (opts.from) where.push(sql`a.created_at >= ${opts.from}`);
  if (opts.to) where.push(sql`a.created_at <= ${opts.to}`);
  const whereSql = where.length ? sql`WHERE ${sql.join(where, sql` AND `)}` : sql``;
  // SAFETY: The SELECT list matches AuditEventRow (audit columns, left-joined user name, and window count).
  const rows = db.all(sql`
    SELECT a.*, u.name AS actor_name, COUNT(*) OVER () AS _total
    FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT ${opts.limit} OFFSET ${opts.offset}
  `) as AuditEventRow[];
  const total = rows.length ? Number(rows[0]._total) : 0;
  const events = rows.map(({ _total: _t, ...e }) => e);
  return { events, total };
}

export interface NotificationRow {
  id: string;
  actor_id: string;
  action: string;
  entity_id: string;
  created_at: string;
  actor_name: string | null;
  is_read: number;
}

export function listNotifications(
  opts: { userId: string; role: string; departmentId?: string },
  db: Db = defaultDb,
): NotificationRow[] {
  let where: SQL;
  if (opts.role === 'ADMIN') {
    where = sql`1=1`;
  } else if (opts.role === 'HOD') {
    where = sql`a.actor_id = ${opts.userId} OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT r.id FROM reports r JOIN users u ON u.id = r.faculty_id WHERE u.department_id = ${opts.departmentId ?? ''}))`;
  } else {
    where = sql`a.actor_id = ${opts.userId} OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT id FROM reports WHERE faculty_id = ${opts.userId}))`;
  }
  // SAFETY: The SELECT list matches NotificationRow (audit columns, left-joined user name, read flag).
  return db.all(sql`
    SELECT a.id, a.actor_id, a.action, a.entity_id, a.created_at, u.name AS actor_name,
      CASE WHEN nr.event_id IS NULL THEN 0 ELSE 1 END AS is_read
    FROM audit_events a
    LEFT JOIN users u ON u.id = a.actor_id
    LEFT JOIN notification_reads nr ON nr.event_id = a.id AND nr.user_id = ${opts.userId}
    WHERE ${where}
    ORDER BY a.created_at DESC LIMIT 30
  `) as NotificationRow[];
}

export function markNotificationRead(userId: string, eventId: string, readAt: string, db: Db = defaultDb) {
  db.run(sql`INSERT OR REPLACE INTO notification_reads (user_id, event_id, read_at) VALUES (${userId}, ${eventId}, ${readAt})`);
}

export function markNotificationUnread(userId: string, eventId: string, db: Db = defaultDb) {
  db.run(sql`DELETE FROM notification_reads WHERE user_id = ${userId} AND event_id = ${eventId}`);
}

export function markAllNotificationsRead(userId: string, db: Db = defaultDb) {
  const now = new Date().toISOString();
  db.run(sql`
    INSERT OR REPLACE INTO notification_reads (user_id, event_id, read_at)
    SELECT ${userId}, id, ${now} FROM audit_events
  `);
}
