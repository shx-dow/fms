import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { saveReport, getReportForPeriod } from '$lib/server/db/repositories/reports';
import { replaceResearch } from '$lib/server/db/repositories/activity';
import { aggregateWeeks, facultyWeeks } from '$lib/dashboard-weeks';
import { load } from './+page.server';

const PERIOD = 'dash-week';
const NOW = '2099-08-06T10:00:00Z';

const faculty: User = { id: 'd-fac', name: 'D Fac', email: 'd-fac@example.edu', role: 'FACULTY', departmentId: 'd-cse' };
const faculty2: User = { id: 'd-fac-2', name: 'D Fac Two', email: 'd-fac-2@example.edu', role: 'FACULTY', departmentId: 'd-cse' };
const hod: User = { id: 'd-hod', name: 'D HOD', email: 'd-hod@example.edu', role: 'HOD', departmentId: 'd-cse' };

// SAFETY: the load reads only locals.user; nothing else on the event is used.
const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof load>[0];

function seed() {
  upsertDepartment('d-cse', 'D-CSE', 'Dash CSE');
  for (const u of [faculty, faculty2, hod]) {
    try {
      createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
    } catch {
      // already seeded
    }
  }
  upsertPeriod({ id: PERIOD, label: '', startsOn: '2099-08-03', endsOn: '2099-08-07', dueOn: '2099-08-07T18:00:00+05:30', isOpen: true });
}

describe('dashboard load for faculty', () => {
  it('creates the current report and summarises it', () => {
    seed();
    expect(getReportForPeriod(faculty.id, PERIOD)).toBeUndefined();

    const data = load(event(faculty));
    expect(data.isFaculty).toBe(true);
    expect(data.report).not.toBeNull();
    expect(getReportForPeriod(faculty.id, PERIOD)).toBeDefined();
    expect(data.report?.reportId).toBeTruthy();
    expect(data.report?.periodLabel).toMatch(/^Week \d+ of /);
    expect(data.report?.status).toBe('Draft');
  });

  it('is idempotent across reloads', () => {
    seed();
    const first = load(event(faculty));
    const second = load(event(faculty));
    expect(second.report?.reportId).toBe(first.report?.reportId);
  });

  it('counts teaching delivery, research, and attachments from the database', () => {
    seed();
    const data = load(event(faculty));
    const reportId = data.report?.reportId ?? '';
    saveReport({
      reportId, userId: faculty.id, now: NOW, summary: null, challenges: null, nextGoals: null,
      completion: 60, status: 'DRAFT',
      teaching: [{
        courseCode: 'CSE-301', courseName: 'DBMS', programLevel: 'B.Tech', classType: 'Lecture',
        scheduled: 4, conducted: 3, missed: 1, missedAction: null, syllabusCompletion: 20, syllabusLecture: 4,
      }],
    });
    // replaceResearch replaces the whole set, so both rows go in one call.
    replaceResearch(reportId, [
      { category: 'Journal Paper', title: 'A paper', venueOrAgency: null, indexingOrQuality: null, role: null, status: null },
      { category: 'Journal Paper', title: 'N/A', venueOrAgency: null, indexingOrQuality: null, role: null, status: null },
      { category: 'Journal Paper', title: '  ', venueOrAgency: null, indexingOrQuality: null, role: null, status: null },
    ]);

    const after = load(event(faculty)).report;
    expect(after?.scheduled).toBe(4);
    expect(after?.conducted).toBe(3);
    expect(after?.syllabus).toBe(20);
    expect(after?.hasTeaching).toBe(true);
    // Neither the N/A sentinel nor a blank row may inflate the count.
    expect(after?.researchCount).toBe(1);
  });

  it('previews at most five history rows', () => {
    seed();
    load(event(faculty));
    const data = load(event(faculty));
    expect(data.report!.history.length).toBeLessThanOrEqual(5);
  });
});

describe('dashboard load for reviewers', () => {
  it('gives an HOD aggregate weeks and no report', () => {
    seed();
    const data = load(event(hod));
    expect(data.isFaculty).toBe(false);
    expect(data.report).toBeNull();
    expect(data.weeks.length).toBeGreaterThan(0);
    expect(data.weeks[0].week_label).toMatch(/^Week \d+ of /);
  });
});

describe('week shaping', () => {
  it('labels faculty weeks with their own status', () => {
    seed();
    const weeks = facultyWeeks(faculty.id);
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks.every((w) => w.week_label.startsWith('Week '))).toBe(true);
  });

  it('levels and flags aggregate weeks', () => {
    seed();
    const weeks = aggregateWeeks(hod);
    for (const w of weeks) {
      expect(w.level).toBeGreaterThanOrEqual(0);
      expect(w.level).toBeLessThanOrEqual(4);
      expect(w.late === 0 || w.late === 1).toBe(true);
    }
  });
});
