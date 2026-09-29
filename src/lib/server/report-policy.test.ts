import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from './local-db';
import { seededOpenPeriod } from '../../test/seeded-periods';
import { ensureCurrentPeriod } from './db/repositories/periods';
import { canAccessReport, canWriteReport, policyFor } from './report-policy';

function makeDb(): BetterSQLite3Database {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

// The seed dates its periods from the current week, so the test clock is read
// off the open period instead of being pinned to a date that goes stale.
const openPeriod = seededOpenPeriod();
const withinDeadline = new Date(`${openPeriod.starts_on}T12:00:00Z`);
const afterDeadline = new Date(`${openPeriod.ends_on}T23:00:00Z`);
const pastDueOn = '2020-01-10T18:00:00+05:30';
const reopenUntil = new Date(`${openPeriod.ends_on}T23:30:00Z`).toISOString();
const expiredReopen = '2020-01-01T00:00:00Z';

describe('currentPeriod', () => {
  it('returns the single open reporting period', () => {
    const db = makeDb();
    const period = ensureCurrentPeriod(db);
    expect(period?.is_open).toBe(1);
    expect(period?.id).toMatch(/^week-\d{4}-\d{2}-\d{2}$/);
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
    const p = policyFor({ status: 'SUBMITTED', reopened_until: reopenUntil }, withinDeadline, makeDb());
    expect(p.locked).toBe(false);
    expect(p.canEdit).toBe(true);
  });

  it('keeps a SUBMITTED report locked when the reopen has expired', () => {
    const p = policyFor({ status: 'SUBMITTED', reopened_until: expiredReopen }, withinDeadline, makeDb());
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
    const p = policyFor({ status: 'CHANGES_REQUIRED', reopened_until: reopenUntil }, afterDeadline, makeDb());
    expect(p.canEdit).toBe(true);
  });

  it('never allows editing an APPROVED report', () => {
    const p = policyFor({ status: 'APPROVED' }, withinDeadline, makeDb());
    expect(p.locked).toBe(true);
    expect(p.canEdit).toBe(false);
  });

  it('locks a DRAFT whose own period has closed even while the current period is open', () => {
    const ownClosedPeriod = { due_on: pastDueOn, is_open: 0 };
    const p = policyFor({ status: 'DRAFT' }, withinDeadline, makeDb(), ownClosedPeriod);
    expect(p.open).toBe(false);
    expect(p.canEdit).toBe(false);
    expect(p.deadline.toISOString()).toBe('2020-01-10T12:30:00.000Z');
  });

  it('edits a DRAFT whose own period is open and reports its own deadline', () => {
    const ownOpenPeriod = { due_on: openPeriod.due_on, is_open: 1 };
    const p = policyFor({ status: 'DRAFT' }, withinDeadline, makeDb(), ownOpenPeriod);
    expect(p.open).toBe(true);
    expect(p.canEdit).toBe(true);
    expect(p.deadline.toISOString()).toBe(new Date(openPeriod.due_on).toISOString());
  });

  it('still falls back to the current period when no report period is supplied', () => {
    const p = policyFor({ status: 'DRAFT' }, withinDeadline, makeDb());
    expect(p.open).toBe(true);
    expect(p.canEdit).toBe(true);
    expect(p.deadline.toISOString()).toBe(new Date(openPeriod.due_on).toISOString());
  });
});

describe('canAccessReport', () => {
  const reportId = 'r-access';

  function dbWithReport(): BetterSQLite3Database {
    const raw = createDatabase({ filename: ':memory:', seed: true });
    raw
      .prepare(
        `INSERT INTO reports (id, faculty_id, period_id, status, created_at, updated_at)
         VALUES (?, 'dev-faculty-1', ?, 'DRAFT', '2026-07-28T00:00:00Z', '2026-07-28T00:00:00Z')`,
      )
      .run(reportId, openPeriod.id);
    return drizzle(raw);
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

describe('canWriteReport', () => {
  const reportId = 'r-write';

  function dbWithReport(status = 'DRAFT', reopenedUntil: string | null = null): BetterSQLite3Database {
    const raw = createDatabase({ filename: ':memory:', seed: true });
    raw
      .prepare(
        `INSERT INTO reports (id, faculty_id, period_id, status, created_at, updated_at, reopened_until)
         VALUES (?, 'dev-faculty-1', ?, ?, '2026-07-28T00:00:00Z', '2026-07-28T00:00:00Z', ?)`,
      )
      .run(reportId, openPeriod.id, status, reopenedUntil);
    return drizzle(raw);
  }

  const faculty = { id: 'dev-faculty-1', role: 'FACULTY' as const, departmentId: 'cse' };

  it('allows the owning faculty to edit an open DRAFT', () => {
    expect(canWriteReport(faculty, reportId, dbWithReport('DRAFT'), withinDeadline)).toBe(true);
  });

  it('blocks editing once the deadline has passed', () => {
    expect(canWriteReport(faculty, reportId, dbWithReport('DRAFT'), afterDeadline)).toBe(false);
  });

  it('blocks a non-owner faculty member', () => {
    expect(canWriteReport({ ...faculty, id: 'dev-faculty-2' }, reportId, dbWithReport('DRAFT'), withinDeadline)).toBe(false);
  });

  it('blocks a SUBMITTED report even while the period is open', () => {
    expect(canWriteReport(faculty, reportId, dbWithReport('SUBMITTED'), withinDeadline)).toBe(false);
  });

  it('allows editing a SUBMITTED report with an active reopen', () => {
    expect(canWriteReport(faculty, reportId, dbWithReport('SUBMITTED', reopenUntil), afterDeadline)).toBe(true);
  });

  it('denies HOD and Admin write access', () => {
    expect(canWriteReport({ id: 'dev-hod-1', role: 'HOD', departmentId: 'cse' }, reportId, dbWithReport('DRAFT'), withinDeadline)).toBe(false);
    expect(canWriteReport({ id: 'dev-admin-1', role: 'ADMIN' }, reportId, dbWithReport('DRAFT'), withinDeadline)).toBe(false);
  });

  it('returns false for an unknown report', () => {
    expect(canWriteReport(faculty, 'does-not-exist', dbWithReport('DRAFT'), withinDeadline)).toBe(false);
  });
});
