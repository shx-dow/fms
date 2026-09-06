import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from '../../local-db';
import type { Db } from '../client';
import {
  createSessionRecord,
  deleteSessionRecord,
  findUserBySession,
  deleteExpiredSessions,
  deleteSessionsForUser,
  deleteSessionsForUserExcept,
} from './sessions';

function makeDb(): Db {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

describe('sessions', () => {
  it('resolves an active unexpired session to its user', () => {
    const db = makeDb();
    createSessionRecord('sess-1', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    expect(findUserBySession('sess-1', db)).toMatchObject({ id: 'dev-faculty-1', role: 'FACULTY' });
  });

  it('does not resolve an expired session', () => {
    const db = makeDb();
    createSessionRecord('sess-1', 'dev-faculty-1', '2000-01-01T00:00:00Z', db);
    expect(findUserBySession('sess-1', db)).toBeUndefined();
  });

  it('does not resolve a session for an inactive user', () => {
    const db = makeDb();
    createSessionRecord('sess-1', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    db.run(sql`UPDATE users SET is_active = 0 WHERE id = 'dev-faculty-1'`);
    expect(findUserBySession('sess-1', db)).toBeUndefined();
  });

  it('deletes expired sessions in bulk', () => {
    const db = makeDb();
    createSessionRecord('old', 'dev-faculty-1', '2000-01-01T00:00:00Z', db);
    createSessionRecord('new', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    deleteExpiredSessions(db);
    // SAFETY: The SELECT list projects exactly the id column from sessions.
    expect(db.all(sql`SELECT id FROM sessions ORDER BY id`) as { id: string }[]).toEqual([{ id: 'new' }]);
  });

  it('deletes all sessions for a user', () => {
    const db = makeDb();
    createSessionRecord('s1', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    createSessionRecord('s2', 'dev-faculty-2', '2099-01-01T00:00:00Z', db);
    deleteSessionsForUser('dev-faculty-1', db);
    // SAFETY: The SELECT list projects exactly the id column from sessions.
    expect(db.all(sql`SELECT id FROM sessions`) as { id: string }[]).toEqual([{ id: 's2' }]);
  });

  it('deletes a single session', () => {
    const db = makeDb();
    createSessionRecord('sess-del', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    deleteSessionRecord('sess-del', db);
    expect(findUserBySession('sess-del', db)).toBeUndefined();
  });

  it('deletes all sessions for a user except the current one', () => {
    const db = makeDb();
    createSessionRecord('s1', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    createSessionRecord('s2', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    createSessionRecord('s3', 'dev-faculty-2', '2099-01-01T00:00:00Z', db);
    deleteSessionsForUserExcept('dev-faculty-1', 's2', db);
    // SAFETY: The SELECT list projects exactly the id column from sessions.
    expect(db.all(sql`SELECT id FROM sessions ORDER BY id`) as { id: string }[]).toEqual([{ id: 's2' }, { id: 's3' }]);
  });
});
