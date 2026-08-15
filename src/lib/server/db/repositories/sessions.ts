import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  employee_code: string | null;
  personal_email: string | null;
  mobile: string | null;
  specialization: string | null;
  role: 'FACULTY' | 'HOD' | 'ADMIN';
  department_id?: string;
}

export function createSessionRecord(id: string, userId: string, expires: string, db: Db = defaultDb) {
  db.run(sql`INSERT INTO sessions VALUES (${id}, ${userId}, ${expires})`);
}

export function findUserBySession(sessionId: string, db: Db = defaultDb): SessionUser | undefined {
  // SAFETY: SELECT u.* matches SessionUser; user columns come from sqlite-schema.ts.
  return db.get(sql`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId} AND s.expires_at > ${new Date().toISOString()} AND u.is_active = 1
  `) as SessionUser | undefined;
}

export function deleteSessionRecord(sessionId: string, db: Db = defaultDb) {
  db.run(sql`DELETE FROM sessions WHERE id = ${sessionId}`);
}

export function deleteExpiredSessions(db: Db = defaultDb) {
  db.run(sql`DELETE FROM sessions WHERE expires_at <= ${new Date().toISOString()}`);
}

export function deleteSessionsForUser(userId: string, db: Db = defaultDb) {
  db.run(sql`DELETE FROM sessions WHERE user_id = ${userId}`);
}

export function deleteSessionsForUserExcept(userId: string, keepSessionId: string, db: Db = defaultDb) {
  db.run(sql`DELETE FROM sessions WHERE user_id = ${userId} AND id <> ${keepSessionId}`);
}
