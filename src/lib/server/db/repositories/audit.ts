import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export function insertAuditEvent(
  fields: { id: string; actorId: string; action: string; entityType: string; entityId: string; createdAt: string },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO audit_events VALUES (${fields.id}, ${fields.actorId}, ${fields.action}, ${fields.entityType}, ${fields.entityId}, ${fields.createdAt})
  `);
}

export function listAuditEvents(db: Db = defaultDb): Record<string, unknown>[] {
  return db.all(sql`
    SELECT a.*, u.name AS actor_name
    FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id
    ORDER BY a.created_at DESC LIMIT 100
  `) as Record<string, unknown>[];
}

export function listNotifications(
  opts: { userId: string; role: string; departmentId?: string },
  db: Db = defaultDb,
): Record<string, unknown>[] {
  let where: SQL;
  if (opts.role === 'ADMIN') {
    where = sql`1=1`;
  } else if (opts.role === 'HOD') {
    where = sql`a.actor_id = ${opts.userId} OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT r.id FROM reports r JOIN users u ON u.id = r.faculty_id WHERE u.department_id = ${opts.departmentId ?? ''}))`;
  } else {
    where = sql`a.actor_id = ${opts.userId} OR (a.entity_type = 'REPORT' AND a.entity_id IN (SELECT id FROM reports WHERE faculty_id = ${opts.userId}))`;
  }
  return db.all(sql`
    SELECT a.id, a.action, a.entity_id, a.created_at, u.name AS actor_name,
      CASE WHEN nr.event_id IS NULL THEN 0 ELSE 1 END AS is_read
    FROM audit_events a
    LEFT JOIN users u ON u.id = a.actor_id
    LEFT JOIN notification_reads nr ON nr.event_id = a.id AND nr.user_id = ${opts.userId}
    WHERE ${where}
    ORDER BY a.created_at DESC LIMIT 30
  `) as Record<string, unknown>[];
}

export function markNotificationRead(userId: string, eventId: string, readAt: string, db: Db = defaultDb) {
  db.run(sql`INSERT OR REPLACE INTO notification_reads (user_id, event_id, read_at) VALUES (${userId}, ${eventId}, ${readAt})`);
}

export function markNotificationUnread(userId: string, eventId: string, db: Db = defaultDb) {
  db.run(sql`DELETE FROM notification_reads WHERE user_id = ${userId} AND event_id = ${eventId}`);
}

export function markAllNotificationsRead(userId: string, db: Db = defaultDb) {
  const events = db.all(sql`SELECT id FROM audit_events`) as { id: string }[];
  const now = new Date().toISOString();
  db.transaction((tx) => {
    for (const event of events) {
      tx.run(sql`INSERT OR REPLACE INTO notification_reads (user_id, event_id, read_at) VALUES (${userId}, ${event.id}, ${now})`);
    }
  });
}
