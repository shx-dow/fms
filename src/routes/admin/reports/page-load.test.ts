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

// SAFETY: the load reads only locals.user; nothing else on the event is used.
const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof load>[0];

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
  it('gives an HOD only their own department reports, labelled', () => {
    seed();
    const data = load(event(hodCse));
    expect(data.reports.map((r) => r.id)).toEqual(['q-report-cse']);
    expect(data.reports[0].period_label).toMatch(/^Week \d+ of /);
    expect(data.reports[0].faculty_name).toBe('Q Fac CSE');
  });

  it('gives an admin every report', () => {
    seed();
    const ids = load(event(admin)).reports.map((r) => r.id).sort();
    expect(ids).toEqual(['q-report-cse', 'q-report-eee']);
  });

  it('refuses anonymous and faculty callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(facultyCse))).toThrow();
  });
});
