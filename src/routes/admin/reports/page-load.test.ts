import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, setReportStatus } from '$lib/server/db/repositories/reports';
import { load } from './+page.server';

const PERIOD = 'queue-week';
const NOW = '2099-06-06T10:00:00Z';

const admin: User = { id: 'q-admin', name: 'Q Admin', email: 'q-admin@example.edu', role: 'ADMIN' };
const hodCse: User = { id: 'q-hod-cse', name: 'Q HOD CSE', email: 'q-hod-cse@example.edu', role: 'HOD', departmentId: 'q-cse' };
const hodEee: User = { id: 'q-hod-eee', name: 'Q HOD EEE', email: 'q-hod-eee@example.edu', role: 'HOD', departmentId: 'q-eee' };
const facultyCse: User = { id: 'q-fac-cse', name: 'Q Fac CSE', email: 'q-fac-cse@example.edu', role: 'FACULTY', departmentId: 'q-cse' };
const facultyEee: User = { id: 'q-fac-eee', name: 'Q Fac EEE', email: 'q-fac-eee@example.edu', role: 'FACULTY', departmentId: 'q-eee' };

// SAFETY: the load reads only locals.user and the request URL; nothing else is used.
const event = (user: User | null, query = '') =>
  ({ locals: { user }, url: new URL(`http://localhost/admin/reports${query}`) }) as Parameters<typeof load>[0];

function seed() {
  upsertDepartment('q-cse', 'Q-CSE', 'Queue CSE');
  upsertDepartment('q-eee', 'Q-EEE', 'Queue EEE');
  for (const u of [facultyCse, facultyEee, hodCse, hodEee, admin]) {
    try {
      createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
    } catch {
      // already seeded
    }
  }
  upsertPeriod({ id: PERIOD, label: '', startsOn: '2099-06-02', endsOn: '2099-06-06', dueOn: '2099-06-06T18:00:00+05:30', isOpen: true });
  for (const [id, owner] of [['q-report-cse', facultyCse.id], ['q-report-eee', facultyEee.id]] as const) {
    insertReportOrIgnore({ id, facultyId: owner, periodId: PERIOD, createdAt: NOW, updatedAt: NOW });
    setReportStatus(id, 'SUBMITTED', NOW);
  }
}

describe('review queue load', () => {
  // An HOD reviews across the institute, so the queue is not department-scoped.
  it('gives an HOD every report, labelled, across departments', () => {
    seed();
    const data = load(event(hodCse));
    expect(data.reports.map((r) => r.id).sort()).toEqual(['q-report-cse', 'q-report-eee']);
    expect(data.reports[0].period_label).toMatch(/^Week \d+ of /);
    expect(data.reports.map((r) => r.faculty_name).sort()).toEqual(['Q Fac CSE', 'Q Fac EEE']);
  });

  it('offers every reporting week as a filter, marking the open one', () => {
    seed();
    const { periods } = load(event(hodCse));
    expect(periods.some((p) => p.isOpen === 1)).toBe(true);
    expect(periods.every((p) => p.label.startsWith('Week '))).toBe(true);
  });

  it('narrows the queue by name, and echoes the filter back', () => {
    seed();
    const data = load(event(hodCse, '?q=EEE'));
    expect(data.reports.map((r) => r.id)).toEqual(['q-report-eee']);
    expect(data.filters.q).toBe('EEE');
  });

  it('ignores a status it does not know rather than showing nothing', () => {
    seed();
    const data = load(event(hodCse, '?status=NOT_A_STATUS'));
    expect(data.filters.status).toBe('');
    expect(data.reports).toHaveLength(2);
  });

  it('narrows the queue by status and by week', () => {
    seed();
    setReportStatus('q-report-cse', 'APPROVED', NOW);
    expect(load(event(hodCse, '?status=APPROVED')).reports.map((r) => r.id)).toEqual(['q-report-cse']);
    expect(load(event(hodCse, '?status=SUBMITTED')).reports.map((r) => r.id)).toEqual(['q-report-eee']);
    expect(load(event(hodCse, `?period=${PERIOD}`)).reports).toHaveLength(2);
    expect(load(event(hodCse, '?period=no-such-week')).reports).toHaveLength(0);
  });

  // ADMIN manages the system and stays out of the reporting flow.
  it('refuses an admin, because reviewing is a teaching-side job', () => {
    seed();
    expect(() => load(event(admin))).toThrow();
  });

  it('refuses anonymous and faculty callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(facultyCse))).toThrow();
  });
});
