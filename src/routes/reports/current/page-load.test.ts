import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser, updateUserProfile } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { upsertPeriod, ensureCurrentPeriod } from '$lib/server/db/repositories/periods';
import { getReportForPeriod, saveReport, setReportStatus } from '$lib/server/db/repositories/reports';
import { insertReview } from '$lib/server/db/repositories/reviews';
import { load } from './+page.server';

const PERIOD = 'ed-week';
const NOW = '2099-09-06T10:00:00Z';

const faculty: User = { id: 'e-fac', name: 'E Fac', email: 'e-fac@example.edu', role: 'FACULTY', departmentId: 'e-cse' };
const hod: User = { id: 'e-hod', name: 'E HOD', email: 'e-hod@example.edu', role: 'HOD', departmentId: 'e-cse' };

// SAFETY: the load reads only locals.user; nothing else on the event is used.
const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof load>[0];

function seed() {
  upsertDepartment('e-cse', 'E-CSE', 'Editor CSE');
  for (const u of [faculty, hod]) {
    try {
      createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
    } catch {
      // already seeded
    }
  }
  upsertPeriod({ id: PERIOD, label: '', startsOn: '2099-09-01', endsOn: '2099-09-05', dueOn: '2099-09-05T18:00:00+05:30', isOpen: true });
}

describe('report editor load', () => {
  it('creates the report on first visit and stays idempotent', () => {
    seed();
    expect(getReportForPeriod(faculty.id, PERIOD)).toBeUndefined();

    const first = load(event(faculty));
    expect(first.reportId).toBeTruthy();
    expect(first.reportStatus).toBe('DRAFT');
    expect(first.canEdit).toBe(true);

    const second = load(event(faculty));
    expect(second.reportId).toBe(first.reportId);
  });

  it('returns rows in the shape the editor binds, not the raw database shape', () => {
    seed();
    const first = load(event(faculty));
    saveReport({
      reportId: first.reportId, userId: faculty.id, now: NOW, summary: null, challenges: null, nextGoals: null,
      completion: 20, status: 'DRAFT',
      teaching: [{
        courseCode: 'CSE-301', courseName: 'DBMS', programLevel: 'B.Tech', classType: 'Lecture',
        scheduled: 4, conducted: 2, missed: 0, missedAction: null, syllabusCompletion: 10, syllabusLecture: 5,
      }],
    });
    const second = load(event(faculty));
    expect(second.teaching[0]).toMatchObject({ courseCode: 'CSE-301', missedAction: '', syllabusLecture: 5 });
  });

  it('locks the editor once a report is submitted', () => {
    seed();
    const first = load(event(faculty));
    setReportStatus(first.reportId, 'SUBMITTED', NOW);
    const second = load(event(faculty));
    expect(second.reportStatus).toBe('SUBMITTED');
    expect(second.canEdit).toBe(false);
  });

  it('includes review history and the deadline', () => {
    seed();
    const first = load(event(faculty));
    insertReview({ id: 'e-review-1', reportId: first.reportId, reviewerId: hod.id, decision: 'CHANGES_REQUIRED', remarks: 'Fix numbers', createdAt: NOW });
    const second = load(event(faculty));
    expect(second.reviews).toHaveLength(1);
    expect(second.reviews[0].reviewer_name).toBe('E HOD');
    expect(Number.isNaN(new Date(second.deadline).getTime())).toBe(false);
  });

  it('surfaces a saved recurring template and reports hasTemplate', () => {
    seed();
    updateUserProfile(faculty.id, JSON.stringify({ subjects: [{ courseCode: 'CSE-101', courseName: 'Basics' }] }));
    const data = load(event(faculty));
    expect(data.hasTemplate).toBe(true);
    expect(data.template.subjects[0]).toMatchObject({ courseCode: 'CSE-101' });
  });

  it('tolerates a corrupt stored profile', () => {
    seed();
    updateUserProfile(faculty.id, '{not json');
    const data = load(event(faculty));
    expect(data.hasTemplate).toBe(false);
    expect(data.template.subjects).toEqual([]);
  });

  it('refuses anonymous and non-faculty callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(hod))).toThrow();
  });

  it('always has an open period to report into', () => {
    expect(ensureCurrentPeriod().id).toBeTruthy();
  });
});
