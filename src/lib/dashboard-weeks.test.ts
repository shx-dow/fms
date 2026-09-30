import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, setReportStatus } from '$lib/server/db/repositories/reports';
import { aggregateWeeks, facultyWeeks } from './dashboard-weeks';

const PERIOD = 'dw-week';
const NOW = '2099-05-06T10:00:00Z';

const cseHod: User = { id: 'dw-hod-cse', name: 'Dw HOD CSE', email: 'dw-hod-cse@example.edu', role: 'HOD', departmentId: 'dw-cse' };
const admin: User = { id: 'dw-admin', name: 'Dw Admin', email: 'dw-admin@example.edu', role: 'ADMIN' };
const cseOne: User = { id: 'dw-cse-1', name: 'Dw Cse One', email: 'cse1@example.edu', role: 'FACULTY', departmentId: 'dw-cse' };
const cseTwo: User = { id: 'dw-cse-2', name: 'Dw Cse Two', email: 'cse2@example.edu', role: 'FACULTY', departmentId: 'dw-cse' };
const eeeOne: User = { id: 'dw-eee-1', name: 'Dw Eee One', email: 'eee1@example.edu', role: 'FACULTY', departmentId: 'dw-eee' };

function seed() {
  upsertDepartment('dw-cse', 'DW-CSE', 'Dw Cse');
  upsertDepartment('dw-eee', 'DW-EEE', 'Dw Eee');
  for (const u of [cseHod, admin, cseOne, cseTwo, eeeOne]) {
    try {
      createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
    } catch {
      // already seeded
    }
  }
  upsertPeriod({ id: PERIOD, label: '', startsOn: '2099-05-05', endsOn: '2099-05-09', dueOn: '2099-05-09T18:00:00+05:30', isOpen: true });
  insertReportOrIgnore({ id: 'dw-r-cse-1', facultyId: cseOne.id, periodId: PERIOD, createdAt: NOW, updatedAt: NOW });
  setReportStatus('dw-r-cse-1', 'SUBMITTED', NOW);
}

describe('aggregateWeeks', () => {
  it('counts only the HOD own department', () => {
    seed();
    // The panel is headed "Your department", so an HOD must not see another
    // department's numbers there. Three people teach in CSE; one in EEE.
    const week = aggregateWeeks(cseHod).find((w) => w.id === PERIOD);
    expect(week?.total).toBe(3);
    expect(week?.submitted).toBe(1);
  });

  it('covers the whole institute for an admin, who has no department', () => {
    seed();
    const week = aggregateWeeks(admin).find((w) => w.id === PERIOD);
    expect(week?.total).toBe(4);
  });

  it('labels every week and grades the completion level', () => {
    seed();
    const weeks = aggregateWeeks(cseHod);
    expect(weeks.every((w) => w.week_label.startsWith('Week '))).toBe(true);
    const week = weeks.find((w) => w.id === PERIOD);
    // One of three submitted: more than nothing, not half, not all.
    expect(week?.level).toBe(1);
  });

  it('marks a week overdue once its deadline has passed', () => {
    seed();
    const late = aggregateWeeks(cseHod, new Date('2099-06-01T00:00:00Z')).find((w) => w.id === PERIOD);
    expect(late?.late).toBe(1);
  });
});

describe('facultyWeeks', () => {
  it('carries the person own status per week', () => {
    seed();
    const weeks = facultyWeeks(cseOne.id);
    const week = weeks.find((w) => w.id === PERIOD);
    expect(week?.status).toBe('SUBMITTED');
    expect(weeks.every((w) => w.week_label.startsWith('Week '))).toBe(true);
  });

  it('shows another person week as no report', () => {
    seed();
    expect(facultyWeeks(eeeOne.id).find((w) => w.id === PERIOD)?.status).toBeNull();
  });
});
