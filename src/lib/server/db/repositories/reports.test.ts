import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from '../../local-db';
import type { Db } from '../client';
import { insertReportOrIgnore, saveReport, listWeeksForFaculty, listWeeksAggregate, listReportsForPeriod } from './reports';
import { replaceResearch, listResearch } from './activity';

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
    const teaching = db.all(sql`SELECT * FROM teaching_records WHERE report_id = ${reportId}`) as {
      course_code: string;
      conducted: number;
    }[];
    expect(teaching).toHaveLength(1);
    expect(teaching[0]).toMatchObject({ course_code: 'CSE-301', conducted: 3 });
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
    const row = db.get(sql`SELECT * FROM reports WHERE id = ${reportId}`) as {
      status: string;
      submitted_at: string | null;
    };
    expect(row.status).toBe('SUBMITTED');
    expect(row.submitted_at).toBe(now);
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
    const rows = listResearch(reportId, db) as { title: string; role: string | null }[];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.title).sort()).toEqual(['Paper C', 'Patent B']);
  });
});

describe('weekly grid', () => {
  it('lists every period with the faculty member own report status', () => {
    const db = makeDb();
    const weeks = listWeeksForFaculty('dev-faculty-1', db) as { id: string; status: string | null; completion: number | null }[];
    expect(weeks.map((w) => w.id).sort()).toEqual(['week-2026-07-20', 'week-2026-07-27', 'week-2026-08-03']);
    const past = weeks.find((w) => w.id === 'week-2026-07-20');
    expect(past).toMatchObject({ status: 'SUBMITTED', completion: 82 });
    const open = weeks.find((w) => w.id === 'week-2026-07-27');
    expect(open?.status).toBeNull();
  });

  it('aggregates submitted and approved counts per period, scoped by department', () => {
    const db = makeDb();
    const weeks = listWeeksAggregate({}, db) as { id: string; total: number; submitted: number; approved: number }[];
    const week = weeks.find((w) => w.id === 'week-2026-07-20');
    expect(week).toMatchObject({ total: 3, submitted: 1, approved: 1 });

    const cse = listWeeksAggregate({ departmentId: 'cse' }, db) as { id: string; total: number }[];
    expect(cse.find((w) => w.id === 'week-2026-07-20')?.total).toBe(3);
  });

  it('lists faculty reports for a given period with names', () => {
    const db = makeDb();
    const rows = listReportsForPeriod('week-2026-07-20', {}, db) as {
      faculty_name: string;
      status: string;
      completion: number;
    }[];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.faculty_name).sort()).toEqual(['Faculty User 1', 'Faculty User 2']);
  });
});
