import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, saveReport } from '$lib/server/db/repositories/reports';
import { load, type ReportHistoryData } from './+page.server';

// The report history page renders from load data now, so these assertions
// pin the contract the page depends on: label, status text, and row shape.

const PERIOD = 'load-week-1';
const NOW = '2099-03-06T10:00:00Z';

const faculty: User = { id: 'load-fac', name: 'Load Faculty', email: 'load-fac@example.edu', role: 'FACULTY', departmentId: 'load-cse' };
const faculty2: User = { id: 'load-fac-2', name: 'Load Faculty Two', email: 'load-fac-2@example.edu', role: 'FACULTY', departmentId: 'load-cse' };
const hod: User = { id: 'load-hod', name: 'Load HOD', email: 'load-hod@example.edu', role: 'HOD', departmentId: 'load-cse' };

// SAFETY: the load reads only locals.user; the rest of the event surface is unused by it.
const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof load>[0];

function run(user: User | null): ReportHistoryData {
  return load(event(user));
}

function seed() {
  upsertDepartment('load-cse', 'L-CSE', 'Load CSE');
  for (const u of [faculty, hod]) {
    try {
      createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
    } catch {
      // already created by a previous seed call
    }
  }
  upsertPeriod({ id: PERIOD, label: '', startsOn: '2099-03-03', endsOn: '2099-03-07', dueOn: '2099-03-07T18:00:00+05:30', isOpen: true });
  insertReportOrIgnore({ id: 'load-report-1', facultyId: faculty.id, periodId: PERIOD, createdAt: NOW, updatedAt: NOW });
  saveReport({
    reportId: 'load-report-1', userId: faculty.id, now: NOW, summary: 'Week one.', challenges: null, nextGoals: null,
    completion: 40, status: 'DRAFT', teaching: [],
  });
}

describe('report history load', () => {
  it('returns the current period label, status text, and history rows', () => {
    seed();
    const data = run(faculty);
    expect(data.currentPeriodLabel).toMatch(/^Week \d+ of /);
    expect(data.currentStatus).toBe('Draft');
    const row = data.reports.find((r) => r.id === 'load-report-1');
    expect(row).toBeDefined();
    expect(row?.status).toBe('DRAFT');
    expect(row?.period_label).toMatch(/^Week \d+ of /);
    expect(row?.completion).toBe(40);
  });

  it('never returns another faculty member reports', () => {
    seed();
    try {
      createUser({ id: faculty2.id, name: faculty2.name, email: faculty2.email, role: 'FACULTY', departmentId: 'load-cse' });
    } catch {
      // already created
    }
    const mine = run(faculty).reports.map((r) => r.id);
    const theirs = run(faculty2).reports.map((r) => r.id);
    expect(mine).toContain('load-report-1');
    expect(theirs).not.toContain('load-report-1');
  });

  it('rejects anonymous and non-faculty callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(hod))).toThrow();
  });
});
