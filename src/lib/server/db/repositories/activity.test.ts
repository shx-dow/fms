import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from '../../local-db';
import type { Db } from '../client';
import {
  listDuties,
  listOutreach,
  replaceDuties,
  replaceOutreach,
} from './activity';

function makeDb(): Db {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

describe('activity duties/outreach replace', () => {
  it('replaces duties atomically (no stale rows survive)', () => {
    const db = makeDb();
    const reportId = 'demo-report-submitted';
    replaceDuties(reportId, [{ name: 'Exam Cell', role: 'Member', activity: null, reach: null, outcome: null }], db);
    expect(listDuties(reportId, db)).toHaveLength(1);
    replaceDuties(reportId, [], db);
    expect(listDuties(reportId, db)).toHaveLength(0);
  });

  it('replaces outreach atomically (no stale rows survive)', () => {
    const db = makeDb();
    const reportId = 'demo-report-submitted';
    replaceOutreach(reportId, [{ activity: 'Visit', audience: null, outcome: null, date: null }], db);
    expect(listOutreach(reportId, db)).toHaveLength(1);
    replaceOutreach(
      reportId,
      [
        { activity: 'A', audience: null, outcome: null, date: null },
        { activity: 'B', audience: null, outcome: null, date: null },
      ],
      db,
    );
    expect(listOutreach(reportId, db)).toHaveLength(2);
  });
});
