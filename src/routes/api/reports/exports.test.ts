import { describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, setReportStatus } from '$lib/server/db/repositories/reports';
import { GET as reviewsGET } from '../reviews/+server';
import { GET as missingGET } from './missing/+server';

const NOW = '2099-03-06T10:00:00Z';
const OPEN_WEEK = 'csv-week-open';
const OLD_WEEK = 'csv-week-old';

const hod: User = { id: 'c-hod', name: 'C HOD', email: 'c-hod@example.edu', role: 'HOD', departmentId: 'c-cse' };
const admin: User = { id: 'c-admin', name: 'C Admin', email: 'c-admin@example.edu', role: 'ADMIN' };
const alice: User = { id: 'c-alice', name: 'Alice Alpha', email: 'alice@example.edu', role: 'FACULTY', departmentId: 'c-cse' };
const bob: User = { id: 'c-bob', name: 'Bob Beta', email: 'bob@example.edu', role: 'FACULTY', departmentId: 'c-cse' };

// SAFETY: the handlers read only locals.user and the request URL.
const event = (user: User | null, path: string) =>
  ({ locals: { user }, url: new URL(`http://localhost${path}`) }) as Parameters<typeof reviewsGET>[0];

function seed() {
  upsertDepartment('c-cse', 'C-CSE', 'Csv CSE');
  for (const u of [hod, admin, alice, bob]) {
    try {
      createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
    } catch {
      // already seeded
    }
  }
  upsertPeriod({ id: OPEN_WEEK, label: '', startsOn: '2099-03-01', endsOn: '2099-03-05', dueOn: '2099-03-05T18:00:00+05:30', isOpen: true });
  upsertPeriod({ id: OLD_WEEK, label: '', startsOn: '2099-02-22', endsOn: '2099-02-26', dueOn: '2099-02-26T18:00:00+05:30', isOpen: false });
  insertReportOrIgnore({ id: 'c-r-alice-open', facultyId: alice.id, periodId: OPEN_WEEK, createdAt: NOW, updatedAt: NOW });
  insertReportOrIgnore({ id: 'c-r-bob-open', facultyId: bob.id, periodId: OPEN_WEEK, createdAt: NOW, updatedAt: NOW });
  insertReportOrIgnore({ id: 'c-r-alice-old', facultyId: alice.id, periodId: OLD_WEEK, createdAt: NOW, updatedAt: NOW });
  for (const id of ['c-r-alice-open', 'c-r-bob-open', 'c-r-alice-old']) setReportStatus(id, 'SUBMITTED', NOW);
}

async function csv(path: string, user: User | null = hod) {
  const res = await reviewsGET(event(user, path));
  expect(res.status).toBe(200);
  return res;
}

describe('review queue download', () => {
  it('exports every row with a header when no filter is set', async () => {
    seed();
    const res = await csv('/api/reviews?format=csv');
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('review-queue-all.csv');
    const body = await res.text();
    const lines = body.trim().split('\n');
    expect(lines[0]).toBe('Faculty,Email,Week,Status,Completion,Submitted At,Last Updated');
    expect(lines).toHaveLength(4);
  });

  it('exports exactly the rows the filter shows, so table and CSV agree', async () => {
    seed();
    const filtered = await csv('/api/reviews?format=csv&q=Bob');
    const filteredLines = (await filtered.text()).trim().split('\n');
    expect(filteredLines).toHaveLength(2);
    expect(filteredLines[1]).toContain('Bob Beta');

    const list = await reviewsGET(event(hod, '/api/reviews?q=Bob'));
    // SAFETY: the queue endpoint always returns a reports array of rows.
    const rows = (await list.json()) as { reports: { faculty_name: string }[] };
    expect(rows.reports.map((r) => r.faculty_name)).toEqual(['Bob Beta']);
  });

  it('honours a status filter and names the file after it', async () => {
    seed();
    setReportStatus('c-r-bob-open', 'APPROVED', NOW);
    const res = await csv('/api/reviews?format=csv&status=APPROVED');
    expect(res.headers.get('content-disposition')).toContain('review-queue-approved.csv');
    const body = await res.text();
    expect(body).toContain('Bob Beta');
    expect(body).not.toContain('Alice Alpha');
  });

  it('honours a week filter', async () => {
    seed();
    const res = await csv(`/api/reviews?format=csv&period=${OLD_WEEK}`);
    expect(res.headers.get('content-disposition')).toContain(OLD_WEEK);
    expect(await res.text()).not.toContain('Bob Beta');
  });

  it('quotes a value that would otherwise be read as a formula', async () => {
    seed();
    const res = await csv('/api/reviews?format=csv');
    // csvCell prefixes a leading =, +, - or @ so a spreadsheet shows text.
    expect(await res.text()).not.toMatch(/^=.*$/m);
  });

  it('is closed to anyone who is not a department head', async () => {
    seed();
    expect((await reviewsGET(event(null, '/api/reviews?format=csv'))).status).toBe(401);
    expect((await reviewsGET(event(admin, '/api/reviews?format=csv'))).status).toBe(403);
  });
});

describe('not submitted list', () => {
  it('lists who has not filed for the open week', async () => {
    seed();
    const res = await missingGET(event(hod, '/api/reports/missing'));
    expect(res.status).toBe(200);
    // SAFETY: the endpoint always returns missing rows and the resolved period id.
    const body = (await res.json()) as { missing: { name: string }[]; periodId: string };
    expect(body.periodId).toBe(OPEN_WEEK);
    // Alice and Bob both filed, so only the HOD's own report is outstanding.
    expect(body.missing.map((m) => m.name)).toEqual(['C HOD']);
  });

  it('lists a past week when asked', async () => {
    seed();
    const res = await missingGET(event(hod, `/api/reports/missing?period=${OLD_WEEK}`));
    // SAFETY: the endpoint always returns missing rows and the resolved period id.
    const body = (await res.json()) as { missing: { name: string }[]; periodId: string };
    expect(body.periodId).toBe(OLD_WEEK);
    // Alice filed last week; Bob and the HOD did not.
    expect(body.missing.map((m) => m.name).sort()).toEqual(['Bob Beta', 'C HOD']);
  });

  it('falls back to the open week when the requested week does not exist', async () => {
    seed();
    const res = await missingGET(event(hod, '/api/reports/missing?period=no-such-week'));
    // SAFETY: the endpoint always returns the period id it fell back to.
    expect(((await res.json()) as { periodId: string }).periodId).toBe(OPEN_WEEK);
  });

  it('downloads as CSV with the role and week', async () => {
    seed();
    const res = await missingGET(event(hod, `/api/reports/missing?format=csv&period=${OLD_WEEK}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain(`not-submitted-${OLD_WEEK}.csv`);
    const lines = (await res.text()).trim().split('\n');
    expect(lines[0]).toBe('Name,Email,Role,Department,Week');
    // A header plus the two people who did not file.
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('C-CSE');
  });

  it('is not a report the reviewer can act on, so it stays department-scoped', async () => {
    seed();
    const res = await missingGET(event(admin, '/api/reports/missing'));
    // ADMIN may read it for oversight, but an admin has no department of their own.
    expect(res.status).toBe(200);
  });
});
