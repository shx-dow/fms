import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../../local-db';
import type { Db } from '../client';
import {
  insertAuditEvent,
  listAuditEvents,
  listNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
} from './audit';

function makeDb(): Db {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

const now = '2026-07-28T12:00:00Z';

function insertEvent(db: Db, id: string, actorId: string, entityType: string, entityId: string) {
  insertAuditEvent({ id, actorId, action: 'TEST', entityType, entityId, createdAt: now }, db);
}

describe('audit events', () => {
  it('inserts an event and lists it with the actor name', () => {
    const db = makeDb();
    insertEvent(db, 'ev-1', 'dev-faculty-1', 'USER', 'dev-faculty-1');
    const { events } = listAuditEvents({ limit: 50, offset: 0 }, db);
    const found = events.find((e) => e.id === 'ev-1');
    expect(found).toMatchObject({ actor_id: 'dev-faculty-1', actor_name: 'Faculty User 1' });
  });

  it('filters by action, search and date range and reports total', () => {
    const db = makeDb();
    db.run(sql`DELETE FROM audit_events`);
    for (const [i, actor] of ['dev-faculty-1', 'dev-faculty-2', 'dev-hod-1'].entries()) {
      insertAuditEvent(
        { id: `ev-${i}`, actorId: actor, action: i === 1 ? 'APPROVED' : 'REPORT_SUBMITTED', entityType: 'REPORT', entityId: 'r-1', createdAt: `2026-07-2${i}T12:00:00Z` },
        db,
      );
    }
    const byAction = listAuditEvents({ action: 'APPROVED', limit: 50, offset: 0 }, db);
    expect(byAction.total).toBe(1);
    expect(byAction.events[0].id).toBe('ev-1');

    const bySearch = listAuditEvents({ search: 'Department HOD', limit: 50, offset: 0 }, db);
    expect(bySearch.total).toBe(1);
    expect(bySearch.events[0].actor_id).toBe('dev-hod-1');

    const byRange = listAuditEvents({ from: '2026-07-22T00:00:00Z', to: '2026-07-22T13:00:00Z', limit: 50, offset: 0 }, db);
    expect(byRange.total).toBe(1);
    expect(byRange.events[0].id).toBe('ev-2');
  });

  it('paginates with offset and total', () => {
    const db = makeDb();
    db.run(sql`DELETE FROM audit_events`);
    for (let i = 0; i < 5; i++) insertEvent(db, `ev-${i}`, 'dev-faculty-1', 'USER', 'dev-faculty-1');
    const first = listAuditEvents({ limit: 2, offset: 0 }, db);
    const second = listAuditEvents({ limit: 2, offset: 2 }, db);
    expect(first.total).toBe(5);
    expect(first.events).toHaveLength(2);
    expect(second.events).toHaveLength(2);
    expect(first.events[0].id).not.toBe(second.events[0].id);
  });
});

describe('notifications', () => {
  it('scopes events to the faculty user and their own reports', () => {
    const db = makeDb();
    insertEvent(db, 'ev-own', 'dev-faculty-1', 'USER', 'dev-faculty-1');
    insertEvent(db, 'ev-my-report', 'dev-hod-1', 'REPORT', 'demo-report-submitted');
    insertEvent(db, 'ev-other-report', 'dev-hod-1', 'REPORT', 'demo-report-approved');
    const notifs = listNotifications({ userId: 'dev-faculty-1', role: 'FACULTY' }, db);
    const ids = notifs.map((n) => n.id);
    expect(ids).toContain('ev-own');
    expect(ids).toContain('ev-my-report');
    expect(ids).not.toContain('ev-other-report');
    expect(notifs.find((n) => n.id === 'ev-own')?.is_read).toBe(0);
  });

  it('marks a single event read and unread', () => {
    const db = makeDb();
    insertEvent(db, 'ev-1', 'dev-faculty-1', 'USER', 'dev-faculty-1');
    markNotificationRead('dev-faculty-1', 'ev-1', now, db);
    expect(listNotifications({ userId: 'dev-faculty-1', role: 'FACULTY' }, db).find((n) => n.id === 'ev-1')?.is_read).toBe(1);
    markNotificationUnread('dev-faculty-1', 'ev-1', db);
    expect(listNotifications({ userId: 'dev-faculty-1', role: 'FACULTY' }, db).find((n) => n.id === 'ev-1')?.is_read).toBe(0);
  });

  it('marks all visible events as read', () => {
    const db = makeDb();
    insertEvent(db, 'ev-1', 'dev-faculty-1', 'USER', 'dev-faculty-1');
    insertEvent(db, 'ev-2', 'dev-faculty-1', 'USER', 'dev-faculty-1');
    markAllNotificationsRead('dev-faculty-1', db);
    const notifs = listNotifications({ userId: 'dev-faculty-1', role: 'FACULTY' }, db);
    expect(notifs.length).toBeGreaterThanOrEqual(2);
    expect(notifs.every((n) => n.is_read === 1)).toBe(true);
  });
});
