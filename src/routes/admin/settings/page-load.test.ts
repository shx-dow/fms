import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { upsertPeriod, closeOtherOpenPeriods } from '$lib/server/db/repositories/periods';
import { load } from './+page.server';

const admin: User = { id: 'per-admin', name: 'Per Admin', email: 'per-admin@example.edu', role: 'ADMIN' };
const faculty: User = { id: 'per-fac', name: 'Per Faculty', email: 'per-fac@example.edu', role: 'FACULTY' };

const OPEN = 'per-week-open';
const CLOSED = 'per-week-closed';

// SAFETY: the load reads only locals.user; the rest of the event surface is unused by it.
const event = (user: User | null) => ({ locals: { user } }) as Parameters<typeof load>[0];

function seed() {
  upsertPeriod({ id: CLOSED, label: '', startsOn: '2099-04-01', endsOn: '2099-04-04', dueOn: '2099-04-04T18:00:00+05:30', isOpen: false });
  upsertPeriod({ id: OPEN, label: '', startsOn: '2099-04-07', endsOn: '2099-04-11', dueOn: '2099-04-11T18:00:00+05:30', isOpen: true });
  closeOtherOpenPeriods(OPEN);
}

describe('reporting period settings load', () => {
  it('labels every period and returns only the open one as editable', () => {
    seed();
    const data = load(event(admin));
    expect(data.periods.length).toBeGreaterThanOrEqual(2);
    for (const p of data.periods) expect(p.label).toMatch(/^Week \d+ of /);
    expect(data.openPeriod?.id).toBe(OPEN);
    expect(data.openPeriod?.startsOn).toBe('2099-04-07');
  });

  it('pre-formats the deadline for a datetime-local input', () => {
    seed();
    const due = load(event(admin)).openPeriod?.dueOnInput;
    expect(due).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(due).toBe('2099-04-11T18:00');
  });

  it('refuses anonymous and non-admin callers', () => {
    expect(() => load(event(null))).toThrow();
    expect(() => load(event(faculty))).toThrow();
  });
});
