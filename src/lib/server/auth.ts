import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { sqlite } from './local-db';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, 'hex'));
}
export function createSession(userId: string) {
  const id = randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();
  sqlite.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(id, userId, expires);
  return { id, expires };
}
export function getUserFromSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const row = sqlite
    .prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1',
    )
    .get(sessionId, new Date().toISOString()) as
    | {
        id: string;
        name: string;
        email: string;
        role: 'FACULTY' | 'HOD' | 'ADMIN';
        department_id?: string;
      }
    | undefined;
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        departmentId: row.department_id,
      }
    : null;
}
export function deleteSession(sessionId: string | undefined) {
  if (sessionId) sqlite.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
