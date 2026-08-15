import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  createSessionRecord,
  deleteSessionRecord,
  deleteExpiredSessions,
  findUserBySession,
} from './db/repositories/sessions';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  if (!/^[0-9a-fA-F]{128}$/.test(key)) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, 'hex'));
}
export function createSession(userId: string) {
  const id = randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();
  deleteExpiredSessions();
  createSessionRecord(id, userId, expires);
  return { id, expires };
}
export function getUserFromSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const row = findUserBySession(sessionId);
  return row
    ? {
        id: row.id,
        name: row.name,
        email: row.email,
        employeeCode: row.employee_code,
        personalEmail: row.personal_email,
        mobile: row.mobile,
        specialization: row.specialization,
        role: row.role,
        departmentId: row.department_id,
      }
    : null;
}
export function deleteSession(sessionId: string | undefined) {
  if (sessionId) deleteSessionRecord(sessionId);
}
