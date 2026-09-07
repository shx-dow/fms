import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from './local-db';
import type { Db } from './db/client';
import { insertReportOrIgnore, saveReport, setReportStatus, getReportForPeriod } from './db/repositories/reports';
import { insertReview, listReviewsForReport } from './db/repositories/reviews';
import { reopenReport } from './db/repositories/exceptions';
import { upsertPeriod } from './db/repositories/periods';
import { policyFor } from './report-policy';

function makeDb(): Db {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

const now = '2026-09-08T10:00:00Z';
const reportId = 'lifecycle-report-1';
const facultyId = 'dev-faculty-1';

describe('weekly report lifecycle', () => {
  it('runs draft -> submitted -> approved -> reopened without losing data', () => {
    const db = makeDb();
    upsertPeriod({ id: 'week-2026-09-07', label: 'Week', startsOn: '2026-09-07', endsOn: '2026-09-11', dueOn: '2026-09-11T18:00:00+05:30', isOpen: true }, db);
    insertReportOrIgnore({ id: reportId, facultyId, periodId: 'week-2026-09-07', createdAt: now, updatedAt: now }, db);

    saveReport({
      reportId, userId: facultyId, now, summary: 'Week', challenges: null, nextGoals: null,
      completion: 60, status: 'SUBMITTED',
      teaching: [{
        courseCode: 'CSE-301', courseName: 'DBMS', programLevel: 'III', classType: 'Lecture',
        scheduled: 4, conducted: 4, missed: 0, missedAction: null, syllabusCompletion: 50,
      }],
    }, db);
    expect(getReportForPeriod(facultyId, 'week-2026-09-07', db)?.status).toBe('SUBMITTED');

    setReportStatus(reportId, 'APPROVED', now, db);
    insertReview({ id: 'rv-life-1', reportId, reviewerId: 'dev-hod-1', decision: 'APPROVED', remarks: 'Good', createdAt: now }, db);
    expect(getReportForPeriod(facultyId, 'week-2026-09-07', db)?.status).toBe('APPROVED');
    expect(listReviewsForReport(reportId, db)).toHaveLength(1);

    reopenReport({ reportId, allowedUntil: '2026-09-12T00:00:00Z', reason: 'Fix numbers', updatedAt: now }, db);
    const reopened = getReportForPeriod(facultyId, 'week-2026-09-07', db);
    expect(reopened?.reopen_reason).toBe('Fix numbers');
    expect(
      policyFor({ status: 'SUBMITTED', reopened_until: '2026-09-12T00:00:00Z' }, new Date(now), db, {
        due_on: '2026-09-11T18:00:00+05:30',
        is_open: 1,
      }).canEdit,
    ).toBe(true);
  });
});
