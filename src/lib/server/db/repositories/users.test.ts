import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from '../../local-db';
import type { Db } from '../client';
import {
  listUsers,
  findByEmailWithCredentials,
  setUserActive,
  createUser,
  updateUser,
  createCredentials,
  upsertCredentials,
  getPasswordHash,
  defaultDepartmentId,
} from './users';

function makeDb(): Db {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

describe('users', () => {
  it('creates a user and lists it with the department name', () => {
    const db = makeDb();
    createUser({ id: 'u-new', name: 'New Faculty', email: 'new@example.edu', role: 'FACULTY', departmentId: 'cse' }, db);
    const users = listUsers(db);
    const created = users.find((u) => u.id === 'u-new');
    expect(created).toMatchObject({
      name: 'New Faculty',
      email: 'new@example.edu',
      role: 'FACULTY',
      department_id: 'cse',
      is_active: 1,
      department_name: 'Computer Science and Engineering',
    });
  });

  it('finds credentials by email case-insensitively', () => {
    const db = makeDb();
    const row = findByEmailWithCredentials('FACULTY1@EXAMPLE.EDU', db);
    expect(row?.id).toBe('dev-faculty-1');
    expect(row?.role).toBe('FACULTY');
    expect(row?.password_hash).toBeTruthy();
    expect(findByEmailWithCredentials('nobody@example.edu', db)).toBeUndefined();
  });

  it('deactivates a user and excludes them from login', () => {
    const db = makeDb();
    setUserActive('dev-faculty-1', false, db);
    expect(findByEmailWithCredentials('faculty1@example.edu', db)).toBeUndefined();
    expect(listUsers(db).find((u) => u.id === 'dev-faculty-1')?.is_active).toBe(0);
  });

  it('updates only the supplied fields', () => {
    const db = makeDb();
    updateUser('dev-faculty-1', { name: 'Renamed', role: 'HOD' }, db);
    const row = listUsers(db).find((u) => u.id === 'dev-faculty-1');
    expect(row).toMatchObject({ name: 'Renamed', role: 'HOD', email: 'faculty1@example.edu' });
  });

  it('clears the department when departmentId is null', () => {
    const db = makeDb();
    updateUser('dev-faculty-1', { departmentId: null }, db);
    expect(listUsers(db).find((u) => u.id === 'dev-faculty-1')?.department_id).toBeNull();
  });

  it('upserts a password credential', () => {
    const db = makeDb();
    createCredentials('u-nocred', 'hash-a', db);
    upsertCredentials('u-nocred', 'hash-b', db);
    // SAFETY: The SELECT list projects exactly the password_hash column from credentials.
    const row = db.get(sql`SELECT password_hash FROM credentials WHERE user_id = 'u-nocred'`) as {
      password_hash: string;
    };
    expect(row.password_hash).toBe('hash-b');
  });

  it('fetches the password hash for a user and returns undefined when missing', () => {
    const db = makeDb();
    const row = getPasswordHash('dev-faculty-1', db);
    expect(row?.password_hash).toBeTruthy();
    expect(getPasswordHash('u-does-not-exist', db)).toBeUndefined();
  });

  it('returns the default department id', () => {
    const db = makeDb();
    expect(defaultDepartmentId(db)).toBe('cse');
  });
});
