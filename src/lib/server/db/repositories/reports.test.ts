import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from '../../local-db';
import type { Db } from '../client';
import { insertReport, insertReportOrIgnore, saveReport, setSectionEmpty, getReportForPeriod, listWeeksForFaculty, listWeeksAggregate, listReportsForPeriod, getReportForExport, listExportTeaching, countExportTeaching, MAX_EXPORT_TEACHING_ROWS } from './reports';
import { replaceResearch, listResearch, listTeaching, cloneTeachingIntoReport } from './activity';

function makeDb(): Db {
  return drizzle(createDatabase({ filename: ':memory:', seed: true }));
}

const reportId = 'test-report-1';
const facultyId = 'dev-faculty-1';
const now = '2026-07-28T12:00:00Z';

function setup(db: Db) {
  insertReportOrIgnore(
    { id: reportId, facultyId, periodId: 'week-2026-07-27', createdAt: now, updatedAt: now },
    db,
  );
}

describe('saveReport', () => {
  it('persists draft fields and teaching records without an audit event', () => {
    const db = makeDb();
    setup(db);
    saveReport(
      {
        reportId,
        userId: facultyId,
        now,
        summary: 'Good week',
        challenges: null,
        nextGoals: 'More labs',
        completion: 40,
        status: 'DRAFT',
        teaching: [
          {
            courseCode: 'CSE-301',
            courseName: 'DBMS',
            programLevel: 'B.Tech · III Year',
            classType: 'Lecture',
            scheduled: 4,
            conducted: 3,
            missed: 1,
            missedAction: 'Makeup scheduled',
            syllabusCompletion: 75,
          },
        ],
      },
      db,
    );
    // SAFETY: SELECT * from reports matches the reports table; the test reads only these columns.
    const row = db.get(sql`SELECT * FROM reports WHERE id = ${reportId}`) as {
      status: string;
      summary: string;
      completion: number;
      submitted_at: string | null;
    };
    expect(row.status).toBe('DRAFT');
    expect(row.summary).toBe('Good week');
    expect(row.completion).toBe(40);
    expect(row.submitted_at).toBeNull();
    // SAFETY: SELECT * from teaching_records matches the teaching_records table; the test reads only these columns.
    const teaching = db.all(sql`SELECT * FROM teaching_records WHERE report_id = ${reportId}`) as {
      course_code: string;
      conducted: number;
    }[];
    expect(teaching).toHaveLength(1);
    expect(teaching[0]).toMatchObject({ course_code: 'CSE-301', conducted: 3 });
    // SAFETY: SELECT * from audit_events matches the audit_events table; the test reads only the action column.
    const audits = db.all(sql`SELECT * FROM audit_events WHERE entity_id = ${reportId}`) as {
      action: string;
    }[];
    expect(audits).toHaveLength(0);
  });

  it('sets SUBMITTED status with submitted_at and logs an audit event', () => {
    const db = makeDb();
    setup(db);
    saveReport(
      { reportId, userId: facultyId, now, summary: 'Done', challenges: null, nextGoals: null, completion: 100, status: 'SUBMITTED', teaching: [] },
      db,
    );
    // SAFETY: SELECT * from reports matches the reports table; the test reads only these columns.
    const row = db.get(sql`SELECT * FROM reports WHERE id = ${reportId}`) as {
      status: string;
      submitted_at: string | null;
    };
    expect(row.status).toBe('SUBMITTED');
    expect(row.submitted_at).toBe(now);
    // SAFETY: SELECT * from audit_events matches the audit_events table; the test reads only the action column.
    const audits = db.all(sql`SELECT * FROM audit_events WHERE entity_id = ${reportId}`) as {
      action: string;
    }[];
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('REPORT_SUBMITTED');
  });

  it('replaces teaching records on subsequent saves', () => {
    const db = makeDb();
    setup(db);
    const first = [
      { courseCode: 'CSE-301', courseName: 'DBMS', programLevel: 'III', classType: 'Lecture', scheduled: 4, conducted: 3, missed: 1, missedAction: null, syllabusCompletion: 75 },
    ];
    const second = [
      { courseCode: 'CSE-302', courseName: 'OS', programLevel: 'III', classType: 'Lecture', scheduled: 5, conducted: 5, missed: 0, missedAction: null, syllabusCompletion: 90 },
    ];
    saveReport({ reportId, userId: facultyId, now, summary: null, challenges: null, nextGoals: null, completion: 50, status: 'DRAFT', teaching: first }, db);
    saveReport({ reportId, userId: facultyId, now, summary: null, challenges: null, nextGoals: null, completion: 60, status: 'DRAFT', teaching: second }, db);
    // SAFETY: SELECT * from teaching_records matches the teaching_records table; the test reads only these columns.
    const teaching = db.all(sql`SELECT * FROM teaching_records WHERE report_id = ${reportId}`) as {
      course_code: string;
    }[];
    expect(teaching).toHaveLength(1);
    expect(teaching[0].course_code).toBe('CSE-302');
  });
});

describe('replaceResearch', () => {
  it('replaces research records', () => {
    const db = makeDb();
    setup(db);
    const first = [
      { category: 'Journal Paper', title: 'Paper A', venueOrAgency: null, indexingOrQuality: null, role: null, status: null },
    ];
    const second = [
      { category: 'Patent', title: 'Patent B', venueOrAgency: 'IP Office', indexingOrQuality: null, role: 'Inventor', status: 'Filed' },
      { category: 'Journal Paper', title: 'Paper C', venueOrAgency: null, indexingOrQuality: 'Scopus', role: null, status: 'Submitted' },
    ];
    replaceResearch(reportId, first, db);
    expect(listResearch(reportId, db)).toHaveLength(1);
    replaceResearch(reportId, second, db);
    const rows = listResearch(reportId, db);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.title).sort()).toEqual(['Paper C', 'Patent B']);
  });
});

describe('weekly grid', () => {
  it('lists every period with the faculty member own report status', () => {
    const db = makeDb();
    const weeks = listWeeksForFaculty('dev-faculty-1', db);
    expect(weeks.map((w) => w.id).sort()).toEqual(['week-2026-07-20', 'week-2026-07-27', 'week-2026-08-03']);
    const past = weeks.find((w) => w.id === 'week-2026-07-20');
    expect(past).toMatchObject({ status: 'SUBMITTED', completion: 82 });
    const open = weeks.find((w) => w.id === 'week-2026-07-27');
    expect(open?.status).toBeNull();
  });

  it('aggregates submitted and approved counts per period, scoped by department', () => {
    const db = makeDb();
    const weeks = listWeeksAggregate({}, db);
    const week = weeks.find((w) => w.id === 'week-2026-07-20');
    expect(week).toMatchObject({ total: 3, submitted: 1, approved: 1 });

    const cse = listWeeksAggregate({ departmentId: 'cse' }, db);
    expect(cse.find((w) => w.id === 'week-2026-07-20')?.total).toBe(3);
  });

  it('lists faculty reports for a given period with names', () => {
    const db = makeDb();
    const rows = listReportsForPeriod('week-2026-07-20', {}, db);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.faculty_name).sort()).toEqual(['Faculty User 1', 'Faculty User 2']);
  });
});

describe('cloneTeachingIntoReport', () => {
  it('carries scheduled and syllabus but resets weekly counters', () => {
    const db = makeDb();
    setup(db);
    saveReport({ reportId, userId: facultyId, now, summary: null, challenges: null, nextGoals: null, completion: 50, status: 'DRAFT', teaching: [
      { courseCode: 'CSE-301', courseName: 'DBMS', programLevel: 'III', classType: 'Lecture', scheduled: 4, conducted: 3, missed: 1, missedAction: 'Makeup', syllabusCompletion: 75, syllabusLecture: 18 },
    ] }, db);
    const nextId = 'test-report-next';
    insertReportOrIgnore({ id: nextId, facultyId, periodId: 'week-2026-08-03', createdAt: now, updatedAt: now }, db);
    cloneTeachingIntoReport(nextId, listTeaching(reportId, db), db);
    const cloned = listTeaching(nextId, db);
    expect(cloned).toHaveLength(1);
    expect(cloned[0]).toMatchObject({ course_code: 'CSE-301', scheduled: 4, conducted: 0, missed: 0, missed_action: null, syllabus_lecture: 18 });
  });
});

describe('getReportForExport', () => {
  it('filters by period and status and caps teaching rows at 10', () => {
    const db = makeDb();
    setup(db);
    const teaching = Array.from({ length: 12 }, (_, i) => ({
      courseCode: `CSE-${300 + i}`, courseName: `Course ${i}`, programLevel: 'III', classType: 'Lecture',
      scheduled: 2, conducted: 1, missed: 0, missedAction: null, syllabusCompletion: 50, syllabusLecture: i,
    }));
    saveReport({ reportId, userId: facultyId, now, summary: 'Week', challenges: null, nextGoals: null, completion: 70, status: 'SUBMITTED', teaching }, db);
    expect(getReportForExport(facultyId, { periodId: 'week-2026-07-27' }, db)?.id).toBe(reportId);
    expect(getReportForExport(facultyId, { periodId: 'week-2026-07-27', status: 'DRAFT' }, db)).toBeUndefined();
    expect(getReportForExport(facultyId, { reportId, submitted: true }, db)?.id).toBe(reportId);
    expect(getReportForExport(facultyId, { reportId, submitted: false }, db)).toBeUndefined();
    expect(listExportTeaching(reportId, db)).toHaveLength(MAX_EXPORT_TEACHING_ROWS);
    expect(countExportTeaching(reportId, db)).toMatchObject({ total: 12, scheduled: 24, conducted: 12 });
  });
});

describe('section empty flags and faculty-period uniqueness', () => {
  it('toggles section empty flags per report', () => {
    const db = makeDb();
    setup(db);
    setSectionEmpty(reportId, 'research', true, db);
    expect(getReportForPeriod(facultyId, 'week-2026-07-27', db)).toMatchObject({ research_empty: 1, duties_empty: 0 });
    setSectionEmpty(reportId, 'research', false, db);
    setSectionEmpty(reportId, 'outreach', true, db);
    expect(getReportForPeriod(facultyId, 'week-2026-07-27', db)).toMatchObject({ research_empty: 0, outreach_empty: 1 });
  });

  it('rejects a second report for the same faculty and period', () => {
    const db = makeDb();
    setup(db);
    expect(() =>
      insertReport({ id: 'test-report-dupe', facultyId, periodId: 'week-2026-07-27', createdAt: now, updatedAt: now }, db),
    ).toThrow();
  });
});
