import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, setReportStatus } from '$lib/server/db/repositories/reports';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';
import { load } from './+page.server';

const PERIOD = 'ov-week';
const NOW = '2099-07-06T10:00:00Z';

const admin: User = { id: 'ov-admin', name: 'Ov Admin', email: 'ov-admin@example.edu', role: 'ADMIN' };
const hodCse: User = { id: 'ov-hod', name: 'Ov HOD', email: 'ov-hod@example.edu', role: 'HOD', departmentId: 'ov-cse' };
const facultyCse: User = { id: 'ov-fac', name: 'Ov Fac', email: 'ov-fac@example.edu', role: 'FACULTY', departmentId: 'ov-cse' };
const facultyEee: User = { id: 'ov-fac-2', name: 'Ov Fac Two', email: 'ov-fac-2@example.edu', role: 'FACULTY', departmentId: 'ov-eee' };

// SAFETY: the load reads only locals.user; nothing else on the event is used.
const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof load>[0];

function seed() {
  upsertDepartment('ov-cse', 'O-CSE', 'Overview CSE');
  upsertDepartment('ov-eee', 'O-EEE', 'Overview EEE');
  for (const u of [facultyCse, facultyEee, hodCse, admin]) {
    try {
      createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
    } catch {
      // already seeded
    }
  }
  upsertPeriod({ id: PERIOD, label: '', startsOn: '2099-07-01', endsOn: '2099-07-05', dueOn: '2099-07-05T18:00:00+05:30', isOpen: true });
  insertReportOrIgnore({ id: 'ov-report-cse', facultyId: facultyCse.id, periodId: PERIOD, createdAt: NOW, updatedAt: NOW });
  setReportStatus('ov-report-cse', 'SUBMITTED', NOW);
  try {
    insertAuditEvent({ id: 'ov-audit-1', actorId: admin.id, action: 'APPROVED', entityType: 'REPORT', entityId: 'ov-report-cse', createdAt: NOW });
  } catch {
    // already seeded
  }
}

describe('admin overview load', () => {
  it('scopes an HOD to their own department', () => {
    seed();
    const data = load(event(hodCse));
    expect(data.role).toBe('HOD');
    expect(data.queue.map((r) => r.id)).toEqual(['ov-report-cse']);
    expect(data.missing.map((m) => m.email)).not.toContain('ov-fac-2@example.edu');
    expect(data.periodLabel).toMatch(/^Week \d+ of /);
  });

  it('withholds admin-only panels from an HOD', () => {
    seed();
    const data = load(event(hodCse));
    expect(data.facultyStatus).toEqual([]);
    expect(data.auditEvents).toEqual([]);
  });

  it('gives an admin the full picture', () => {
    seed();
    const data = load(event(admin));
    expect(data.role).toBe('ADMIN');
    expect(data.facultyStatus.length).toBeGreaterThan(0);
    expect(data.auditEvents.length).toBeGreaterThan(0);
    expect(data.facultyCount).toBeGreaterThan(0);
  });

  it('refuses anonymous and faculty callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(facultyCse))).toThrow();
  });
});
