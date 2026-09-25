import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { load } from './+page.server';

const admin: User = { id: 'dir-admin', name: 'Dir Admin', email: 'dir-admin@example.edu', role: 'ADMIN' };
const faculty: User = { id: 'dir-fac', name: 'Dir Faculty', email: 'dir-fac@example.edu', role: 'FACULTY', departmentId: 'dir-cse' };

// SAFETY: the load reads only locals.user; the rest of the event surface is unused by it.
const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof load>[0];

describe('faculty directory load', () => {
  it('returns every user with the fields the table renders', () => {
    upsertDepartment('dir-cse', 'D-CSE', 'Dir CSE');
    try {
      createUser({ id: faculty.id, name: faculty.name, email: faculty.email, role: 'FACULTY', departmentId: 'dir-cse' });
    } catch {
      // already seeded
    }
    const data = load(event(admin));
    const row = data.users.find((u) => u.id === faculty.id);
    expect(row).toBeDefined();
    expect(row?.email).toBe('dir-fac@example.edu');
    expect(row?.is_active).toBe(1);
    expect(row?.department_name).toBe('Dir CSE');
  });

  it('refuses anonymous and non-admin callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(faculty))).toThrow();
  });
});
