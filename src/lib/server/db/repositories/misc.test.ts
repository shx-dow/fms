import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from '../../local-db';
import type { Db } from '../client';
import { listPeriods, ensureCurrentPeriod, upsertPeriod, closeOtherOpenPeriods, deletePeriod } from './periods';
import { listDepartments, upsertDepartment } from './departments';
import { insertAttachment, listAttachments, getAttachmentById, deleteAttachment } from './attachments';
import { insertReview, listReviewsForReport } from './reviews';
import { reopenReport, insertException } from './exceptions';
import { createSessionRecord, findUserBySession, deleteSessionRecord } from './sessions';

function makeDb(): Db {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

const now = '2026-07-28T12:00:00Z';

describe('periods', () => {
  it('lists seeded periods and returns the open one', () => {
    const db = makeDb();
    expect(listPeriods(db)).toHaveLength(3);
    expect(ensureCurrentPeriod(db)?.id).toBe('week-2026-07-27');
  });

  it('upserts a period and closes the others when opened', () => {
    const db = makeDb();
    upsertPeriod({ id: 'week-2026-08-10', label: 'Test week', startsOn: '2026-08-10', endsOn: '2026-08-14', dueOn: '2026-08-14T18:00:00+05:30', isOpen: true }, db);
    closeOtherOpenPeriods('week-2026-08-10', db);
    const open = db.all(sql`SELECT id FROM reporting_periods WHERE is_open = 1`) as { id: string }[];
    expect(open).toEqual([{ id: 'week-2026-08-10' }]);
  });

  it('blocks deleting a period that has reports', () => {
    const db = makeDb();
    expect(() => deletePeriod('week-2026-07-20', db)).toThrow(/reports/);
  });

  it('deletes a period with no reports', () => {
    const db = makeDb();
    deletePeriod('week-2026-08-03', db);
    expect(listPeriods(db).map((p) => p.id)).not.toContain('week-2026-08-03');
  });
});

describe('departments', () => {
  it('creates and updates a department', () => {
    const db = makeDb();
    upsertDepartment('mech', 'MECH', 'Mechanical Engineering', db);
    expect(listDepartments(db).find((d) => d.id === 'mech')).toMatchObject({ code: 'MECH', member_count: 0 });
    upsertDepartment('mech', 'MECH', 'Mechanical Engg', db);
    expect(listDepartments(db).find((d) => d.id === 'mech')?.name).toBe('Mechanical Engg');
  });
});

describe('attachments', () => {
  const fields = {
    id: 'att-1',
    reportId: 'demo-report-submitted',
    ownerId: 'dev-faculty-1',
    filename: 'syllabus.pdf',
    mimeType: 'application/pdf',
    size: 1234,
    storageName: 'att-1-syllabus.pdf',
    createdAt: '2026-07-28T12:00:00Z',
  };

  it('inserts, lists for the owner, and deletes', () => {
    const db = makeDb();
    insertAttachment(fields, db);
    const listed = listAttachments('demo-report-submitted', 'dev-faculty-1', db);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ filename: 'syllabus.pdf', mime_type: 'application/pdf', size: 1234 });
    expect(getAttachmentById('att-1', db)).toMatchObject({ owner_id: 'dev-faculty-1', storage_name: 'att-1-syllabus.pdf' });
    expect(listAttachments('demo-report-submitted', 'dev-faculty-2', db)).toHaveLength(0);
    deleteAttachment('att-1', db);
    expect(getAttachmentById('att-1', db)).toBeUndefined();
  });
});

describe('reviews', () => {
  it('inserts a review and lists it with the reviewer name', () => {
    const db = makeDb();
    insertReview({ id: 'rv-1', reportId: 'demo-report-submitted', reviewerId: 'dev-hod-1', decision: 'CHANGES_REQUIRED', remarks: 'Please update', createdAt: '2026-07-28T12:00:00Z' }, db);
    const reviews = listReviewsForReport('demo-report-submitted', db);
    expect(reviews.find((r) => r.id === 'rv-1')).toMatchObject({ decision: 'CHANGES_REQUIRED', reviewer_name: 'Department HOD' });
  });
});

describe('exceptions', () => {
  it('reopens a report and records the exception', () => {
    const db = makeDb();
    reopenReport({ reportId: 'demo-report-submitted', allowedUntil: '2026-08-05T00:00:00Z', reason: 'Data error', updatedAt: now }, db);
    const report = db.get(sql`SELECT reopened_until, reopen_reason FROM reports WHERE id = 'demo-report-submitted'`) as {
      reopened_until: string;
      reopen_reason: string;
    };
    expect(report).toMatchObject({ reopened_until: '2026-08-05T00:00:00Z', reopen_reason: 'Data error' });
    insertException({ id: 'exc-1', reportId: 'demo-report-submitted', actorId: 'dev-hod-1', reason: 'Data error', allowedUntil: '2026-08-05T00:00:00Z', createdAt: now }, db);
    const exc = db.get(sql`SELECT reason FROM report_exceptions WHERE id = 'exc-1'`) as { reason: string };
    expect(exc.reason).toBe('Data error');
  });
});

describe('sessions', () => {
  it('creates a session, resolves the user, and deletes it', () => {
    const db = makeDb();
    createSessionRecord('sess-1', 'dev-faculty-1', '2099-01-01T00:00:00Z', db);
    expect(findUserBySession('sess-1', db)?.id).toBe('dev-faculty-1');
    deleteSessionRecord('sess-1', db);
    expect(findUserBySession('sess-1', db)).toBeUndefined();
  });
});
