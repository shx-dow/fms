import { describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { createDatabase } from './local-db';
import { canAccessReport, currentPeriod, policyFor } from './report-policy';

function makeDb(): Database.Database {
  return createDatabase({ filename: ':memory:' });
}

const withinDeadline = new Date('2026-07-30T10:00:00Z');
const afterDeadline = new Date('2026-08-01T10:00:00Z');

describe('currentPeriod', () => {
  it('returns the single open reporting period', () => {
    const db = makeDb();
    const period = currentPeriod(db);
    expect(period?.id).toBe('week-2026-07-27');
    expect(period?.is_open).toBe(1);
  });
});

describe('policyFor', () => {
  it('allows editing a DRAFT while the period is open', () => {
    const p = policyFor({ status: 'DRAFT' }, withinDeadline, makeDb());
    expect(p.open).toBe(true);
    expect(p.locked).toBe(false);
    expect(p.canEdit).toBe(true);
  });

  it('blocks editing a DRAFT after the deadline has passed', () => {
    const p = policyFor({ status: 'DRAFT' }, afterDeadline, makeDb());
    expect(p.open).toBe(false);
    expect(p.canEdit).toBe(false);
  });

  it('locks a SUBMITTED report even while the period is open', () => {
    const p = policyFor({ status: 'SUBMITTED' }, withinDeadline, makeDb());
    expect(p.locked).toBe(true);
    expect(p.canEdit).toBe(false);
  });

  it('unlocks a SUBMITTED report with an active reopen exception', () => {
    const p = policyFor({ status: 'SUBMITTED', reopened_until: '2026-08-02T00:00:00Z' }, withinDeadline, makeDb());
    expect(p.locked).toBe(false);
    expect(p.canEdit).toBe(true);
  });

  it('keeps a SUBMITTED report locked when the reopen has expired', () => {
    const p = policyFor({ status: 'SUBMITTED', reopened_until: '2026-07-25T00:00:00Z' }, withinDeadline, makeDb());
    expect(p.locked).toBe(true);
    expect(p.canEdit).toBe(false);
  });

  it('allows editing CHANGES_REQUIRED while the period is open', () => {
    const p = policyFor({ status: 'CHANGES_REQUIRED' }, withinDeadline, makeDb());
    expect(p.locked).toBe(false);
    expect(p.canEdit).toBe(true);
  });

  it('blocks CHANGES_REQUIRED once the period closes without an exception', () => {
    const p = policyFor({ status: 'CHANGES_REQUIRED' }, afterDeadline, makeDb());
    expect(p.open).toBe(false);
    expect(p.canEdit).toBe(false);
  });

  it('reopens CHANGES_REQUIRED after the deadline when an exception is active', () => {
    const p = policyFor({ status: 'CHANGES_REQUIRED', reopened_until: '2026-08-02T00:00:00Z' }, afterDeadline, makeDb());
    expect(p.canEdit).toBe(true);
  });

  it('never allows editing an APPROVED report', () => {
    const p = policyFor({ status: 'APPROVED' }, withinDeadline, makeDb());
    expect(p.locked).toBe(true);
    expect(p.canEdit).toBe(false);
  });
});

describe('canAccessReport', () => {
  const reportId = 'r-access';

  function dbWithReport(): Database.Database {
    const db = makeDb();
    db.prepare(
      `INSERT INTO reports (id, faculty_id, period_id, status, created_at, updated_at)
       VALUES (?, 'dev-faculty-1', 'week-2026-07-27', 'DRAFT', '2026-07-28T00:00:00Z', '2026-07-28T00:00:00Z')`,
    ).run(reportId);
    return db;
  }

  it('allows the owning faculty member', () => {
    expect(canAccessReport({ id: 'dev-faculty-1', role: 'FACULTY', departmentId: 'cse' }, reportId, dbWithReport())).toBe(true);
  });

  it('denies another faculty member', () => {
    expect(canAccessReport({ id: 'dev-faculty-2', role: 'FACULTY', departmentId: 'cse' }, reportId, dbWithReport())).toBe(false);
  });

  it('allows an HOD for the report owner\'s department', () => {
    expect(canAccessReport({ id: 'dev-hod-1', role: 'HOD', departmentId: 'cse' }, reportId, dbWithReport())).toBe(true);
  });

  it('denies an HOD from another department', () => {
    expect(canAccessReport({ id: 'dev-hod-1', role: 'HOD', departmentId: 'mech' }, reportId, dbWithReport())).toBe(false);
  });

  it('allows an admin for any report', () => {
    expect(canAccessReport({ id: 'dev-admin-1', role: 'ADMIN' }, reportId, dbWithReport())).toBe(true);
  });

  it('returns false for an unknown report', () => {
    expect(canAccessReport({ id: 'dev-admin-1', role: 'ADMIN' }, 'does-not-exist', dbWithReport())).toBe(false);
  });
});
