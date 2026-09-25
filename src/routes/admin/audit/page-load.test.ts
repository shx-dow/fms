import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';
import { AUDIT_PAGE_SIZE } from '$lib/audit-filter';
import { load } from './+page.server';

const admin: User = { id: 'audit-admin', name: 'Audit Admin', email: 'audit-admin@example.edu', role: 'ADMIN' };
const faculty: User = { id: 'audit-fac', name: 'Audit Faculty', email: 'audit-fac@example.edu', role: 'FACULTY' };

// SAFETY: the load reads only locals.user and url.searchParams; nothing else on the event is used.
const event = (user: User | null, query = '') => ({
  locals: { user },
  url: new URL(`http://localhost/admin/audit${query}`),
}) as Parameters<typeof load>[0];

function seed() {
  try {
    createUser({ id: faculty.id, name: faculty.name, email: faculty.email, role: 'FACULTY', departmentId: null });
  } catch {
    // already seeded
  }
  for (let i = 0; i < 3; i++) {
    try {
      insertAuditEvent({
        id: `audit-ev-${i}`,
        actorId: faculty.id,
        action: i === 0 ? 'APPROVED' : 'REPORT_SUBMITTED',
        entityType: 'REPORT',
        entityId: `rep-${i}`,
        createdAt: `2099-05-0${i + 1}T10:00:00Z`,
      });
    } catch {
      // already seeded by a previous test in this file
    }
  }
}

describe('audit log load', () => {
  it('returns events with an actor name and a sane page', () => {
    seed();
    const data = load(event(admin));
    expect(data.events.length).toBeGreaterThan(0);
    expect(data.page).toBe(1);
    expect(data.pages).toBeGreaterThanOrEqual(1);
    expect(data.pageSize).toBe(AUDIT_PAGE_SIZE);
    const ev = data.events.find((e) => e.id === 'audit-ev-0');
    expect(ev?.actor_name).toBe('Audit Faculty');
  });

  it('filters by action through the query string', () => {
    seed();
    const all = load(event(admin));
    const approved = load(event(admin, '?action=APPROVED'));
    expect(approved.events.length).toBeLessThan(all.events.length);
    expect(approved.events.every((e) => e.action === 'APPROVED')).toBe(true);
    expect(approved.filters.action).toBe('APPROVED');
  });

  it('filters by free-text search and echoes it back for the form', () => {
    seed();
    const found = load(event(admin, '?q=Audit+Faculty'));
    expect(found.events.length).toBeGreaterThan(0);
    expect(found.filters.q).toBe('Audit Faculty');
    const missed = load(event(admin, '?q=NoSuchActorName'));
    expect(missed.events).toHaveLength(0);
  });

  it('clamps hostile page numbers instead of trusting them', () => {
    seed();
    expect(load(event(admin, '?page=0')).page).toBe(1);
    expect(load(event(admin, '?page=-5')).page).toBe(1);
    expect(load(event(admin, '?page=abc')).page).toBe(1);
    expect(load(event(admin, '?page=1e9')).page).toBeLessThanOrEqual(load(event(admin)).pages);
  });

  it('clamps a page past the end to the last page', () => {
    seed();
    const data = load(event(admin, '?page=9999'));
    expect(data.page).toBe(data.pages);
  });

  it('ignores malformed date filters rather than querying with them', () => {
    seed();
    const data = load(event(admin, '?from=not-a-date&to=2026-13-45'));
    expect(data.filters.from).toBe('');
    expect(data.filters.to).toBe('');
  });

  it('refuses anonymous and non-admin callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(faculty))).toThrow();
  });
});
