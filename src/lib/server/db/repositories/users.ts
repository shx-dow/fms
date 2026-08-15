import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface UserWithDepartment {
  id: string;
  name: string;
  email: string;
  employee_code: string | null;
  personal_email: string | null;
  mobile: string | null;
  specialization: string | null;
  role: string;
  department_id: string | null;
  is_active: number;
  department_name: string | null;
}

export function listUsers(db: Db = defaultDb): UserWithDepartment[] {
  // SAFETY: The SELECT list matches UserWithDepartment (user columns plus the left-joined department name).
  return db.all(sql`
    SELECT u.id, u.name, u.email, u.employee_code, u.personal_email, u.mobile, u.specialization, u.role, u.department_id, u.is_active, d.name AS department_name
    FROM users u LEFT JOIN departments d ON d.id = u.department_id
    ORDER BY u.name
  `) as UserWithDepartment[];
}

export function findByEmailWithCredentials(email: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list projects exactly these three columns from users and credentials.
  return db.get(sql`
    SELECT u.id, u.role, c.password_hash
    FROM users u JOIN credentials c ON c.user_id = u.id
    WHERE (lower(u.email) = lower(${email}) OR lower(u.employee_code) = lower(${email})) AND u.is_active = 1
  `) as { id: string; role: string; password_hash: string } | undefined;
}

export function setUserActive(userId: string, isActive: boolean, db: Db = defaultDb) {
  db.run(sql`UPDATE users SET is_active = ${isActive ? 1 : 0} WHERE id = ${userId}`);
}

export function createUser(
  fields: { id: string; name: string; email: string; employeeCode?: string | null; personalEmail?: string | null; mobile?: string | null; specialization?: string | null; role: string; departmentId: string | null },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO users (id, name, email, employee_code, personal_email, mobile, specialization, role, department_id, is_active)
    VALUES (${fields.id}, ${fields.name}, ${fields.email}, ${fields.employeeCode ?? null}, ${fields.personalEmail ?? null}, ${fields.mobile ?? null}, ${fields.specialization ?? null}, ${fields.role}, ${fields.departmentId}, 1)
  `);
}

export function updateUser(
  userId: string,
  fields: { name?: string; email?: string; employeeCode?: string | null; personalEmail?: string | null; mobile?: string | null; specialization?: string | null; role?: string; departmentId?: string | null },
  db: Db = defaultDb,
) {
  const parts: SQL[] = [];
  if (fields.name) parts.push(sql`name = ${fields.name}`);
  if (fields.email) parts.push(sql`email = ${fields.email}`);
  if ('employeeCode' in fields) parts.push(sql`employee_code = ${fields.employeeCode ?? null}`);
  if ('personalEmail' in fields) parts.push(sql`personal_email = ${fields.personalEmail ?? null}`);
  if ('mobile' in fields) parts.push(sql`mobile = ${fields.mobile ?? null}`);
  if ('specialization' in fields) parts.push(sql`specialization = ${fields.specialization ?? null}`);
  if (fields.role) parts.push(sql`role = ${fields.role}`);
  if ('departmentId' in fields) parts.push(sql`department_id = ${fields.departmentId ?? null}`);
  if (parts.length) db.run(sql`UPDATE users SET ${sql.join(parts, sql.raw(', '))} WHERE id = ${userId}`);
}

export function createCredentials(userId: string, passwordHash: string, db: Db = defaultDb) {
  db.run(sql`INSERT INTO credentials (user_id, password_hash) VALUES (${userId}, ${passwordHash})`);
}

export function upsertCredentials(userId: string, passwordHash: string, db: Db = defaultDb) {
  db.run(sql`INSERT OR REPLACE INTO credentials (user_id, password_hash) VALUES (${userId}, ${passwordHash})`);
}

export function getPasswordHash(userId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list projects exactly the password_hash column from credentials.
  return db.get(sql`SELECT password_hash FROM credentials WHERE user_id = ${userId}`) as
    | { password_hash: string }
    | undefined;
}

export function getUserProfile(userId: string, db: Db = defaultDb) {
  // SAFETY: The SELECT list projects exactly the profile_json column from users.
  return db.get(sql`SELECT profile_json FROM users WHERE id = ${userId}`) as { profile_json: string | null } | undefined;
}

export function updateUserProfile(userId: string, profileJson: string, db: Db = defaultDb) {
  db.run(sql`UPDATE users SET profile_json = ${profileJson} WHERE id = ${userId}`);
}

export function defaultDepartmentId(db: Db = defaultDb): string | null {
  // SAFETY: The SELECT list projects exactly the id column from departments.
  const row = db.get(sql`SELECT id FROM departments ORDER BY name LIMIT 1`) as { id: string } | undefined;
  return row?.id ?? null;
}
