import { beforeAll, describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore } from '$lib/server/db/repositories/reports';
import { GET as reportsGET, POST as reportsPOST } from './reports/+server';
import { GET as reportGET } from './reports/[id]/+server';
import { GET as reviewsGET, POST as reviewsPOST } from './reviews/+server';
import { GET as attachmentsGET } from './attachments/+server';

// Phase 0 safety net: role × endpoint access contract (status codes only).
// Bodies are intentionally not asserted here except where noted; Phase 1/2
// may change bodies (e.g. HOD attachment list) while statuses must hold.

const NOW = '2099-01-06T10:00:00Z';
const PERIOD = 'matrix-week-1';
const REPORT_OWN = 'matrix-report-own'; // matrix-fac-1, dept matrix-cse
const REPORT_OTHER = 'matrix-report-other'; // matrix-fac-2, dept matrix-eee

const faculty1: User = { id: 'matrix-fac-1', name: 'Matrix Fac One', email: 'matrix-fac-1@example.edu', role: 'FACULTY', departmentId: 'matrix-cse' };
const faculty2: User = { id: 'matrix-fac-2', name: 'Matrix Fac Two', email: 'matrix-fac-2@example.edu', role: 'FACULTY', departmentId: 'matrix-eee' };
const hodCse: User = { id: 'matrix-hod-cse', name: 'Matrix HOD CSE', email: 'matrix-hod-cse@example.edu', role: 'HOD', departmentId: 'matrix-cse' };
const hodEee: User = { id: 'matrix-hod-eee', name: 'Matrix HOD EEE', email: 'matrix-hod-eee@example.edu', role: 'HOD', departmentId: 'matrix-eee' };
const admin: User = { id: 'matrix-admin', name: 'Matrix Admin', email: 'matrix-admin@example.edu', role: 'ADMIN' };

type ReportsEvent = Parameters<typeof reportsGET>[0];
type ReportEvent = Parameters<typeof reportGET>[0];
type ReviewsEvent = Parameters<typeof reviewsGET>[0];
type AttachmentsEvent = Parameters<typeof attachmentsGET>[0];

interface MatrixBody {
  reportId?: string;
  completion?: number;
  status?: string;
  decision?: string;
  remarks?: string;
}

function jsonRequest(path: string, body: MatrixBody): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// SAFETY: fabricated RequestEvent surface; handlers under test read only locals/url/request/params.
const getEvent = (user: User | null, path: string) =>
  ({ locals: { user }, url: new URL(path, 'http://localhost') }) as ReportsEvent;
// SAFETY: fabricated RequestEvent surface; handlers under test read only locals/url/request/params.
const reportEvent = (user: User | null, id: string) =>
  ({ locals: { user }, params: { id } }) as ReportEvent;
// SAFETY: fabricated RequestEvent surface; handlers under test read only locals/url/request/params.
const reportsPostEvent = (user: User | null, body: MatrixBody) =>
  ({ locals: { user }, url: new URL('http://localhost/api/reports'), request: jsonRequest('/api/reports', body) }) as ReportsEvent;
// SAFETY: fabricated RequestEvent surface; handlers under test read only locals/url/request/params.
const reviewsGetEvent = (user: User | null) =>
  ({ locals: { user }, url: new URL('http://localhost/api/reviews') }) as ReviewsEvent;
// SAFETY: fabricated RequestEvent surface; handlers under test read only locals/url/request/params.
const reviewsPostEvent = (user: User | null, body: MatrixBody) =>
  ({ locals: { user }, url: new URL('http://localhost/api/reviews'), request: jsonRequest('/api/reviews', body) }) as ReviewsEvent;
// SAFETY: fabricated RequestEvent surface; handlers under test read only locals/url/request/params.
const attachmentsEvent = (user: User | null, reportId: string) =>
  ({ locals: { user }, url: new URL(`http://localhost/api/attachments?reportId=${reportId}`) }) as AttachmentsEvent;

async function status(res: Response | Promise<Response>): Promise<number> {
  return (await res).status;
}

beforeAll(() => {
  upsertDepartment('matrix-cse', 'M-CSE', 'Matrix CSE');
  upsertDepartment('matrix-eee', 'M-EEE', 'Matrix EEE');
  for (const u of [faculty1, faculty2, hodCse, hodEee, admin]) {
    createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
  }
  upsertPeriod({ id: PERIOD, label: 'Matrix Week', startsOn: '2099-01-05', endsOn: '2099-01-09', dueOn: '2099-01-09T18:00:00+05:30', isOpen: true });
  insertReportOrIgnore({ id: REPORT_OWN, facultyId: faculty1.id, periodId: PERIOD, createdAt: NOW, updatedAt: NOW });
  insertReportOrIgnore({ id: REPORT_OTHER, facultyId: faculty2.id, periodId: PERIOD, createdAt: NOW, updatedAt: NOW });
});

describe('anonymous callers', () => {
  it('cannot read or write reports', async () => {
    expect(await status(reportsGET(getEvent(null, '/api/reports')))).toBe(401);
    expect(await status(reportsPOST(reportsPostEvent(null, { reportId: REPORT_OWN })))).toBe(401);
    expect(await status(reportGET(reportEvent(null, REPORT_OWN)))).toBe(401);
  });

  it('cannot reach reviews or attachments', async () => {
    expect(await status(reviewsGET(reviewsGetEvent(null)))).toBe(403);
    expect(await status(reviewsPOST(reviewsPostEvent(null, {})))).toBe(403);
    expect(await status(attachmentsGET(attachmentsEvent(null, REPORT_OWN)))).toBe(401);
  });
});

describe('faculty owner', () => {
  it('reads own report and saves drafts', async () => {
    expect(await status(reportsGET(getEvent(faculty1, '/api/reports')))).toBe(200);
    expect(await status(reportGET(reportEvent(faculty1, REPORT_OWN)))).toBe(200);
    const saved = await reportsPOST(reportsPostEvent(faculty1, { reportId: REPORT_OWN, completion: 50, status: 'DRAFT' }));
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ ok: true });
  });

  it('cannot review reports', async () => {
    expect(await status(reviewsGET(reviewsGetEvent(faculty1)))).toBe(403);
    expect(await status(reviewsPOST(reviewsPostEvent(faculty1, { reportId: REPORT_OWN, decision: 'APPROVED' })))).toBe(403);
  });
});

describe('faculty cross-department read', () => {
  it('cannot read another faculty report', async () => {
    expect(await status(reportGET(reportEvent(faculty2, REPORT_OWN)))).toBe(403);
  });
});

describe('HOD in department scope', () => {
  it('reads scoped reports and the review queue', async () => {
    expect(await status(reportGET(reportEvent(hodCse, REPORT_OWN)))).toBe(200);
    const queue = await reviewsGET(reviewsGetEvent(hodCse));
    expect(queue.status).toBe(200);
    expect(Array.isArray((await queue.json()).reports)).toBe(true);
  });

  it('approves a scoped report', async () => {
    const res = await reviewsPOST(reviewsPostEvent(hodCse, { reportId: REPORT_OWN, decision: 'APPROVED', remarks: 'Matrix review.' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('lists attachments without a scope error', async () => {
    expect(await status(attachmentsGET(attachmentsEvent(hodCse, REPORT_OWN)))).toBe(200);
  });
});

describe('HOD outside department scope', () => {
  it('cannot read or review out-of-scope reports', async () => {
    expect(await status(reportGET(reportEvent(hodEee, REPORT_OWN)))).toBe(403);
    expect(await status(reviewsPOST(reviewsPostEvent(hodEee, { reportId: REPORT_OWN, decision: 'APPROVED' })))).toBe(403);
  });
});

describe('admin', () => {
  it('reads any report and the review queue', async () => {
    expect(await status(reportGET(reportEvent(admin, REPORT_OWN)))).toBe(200);
    expect(await status(reviewsGET(reviewsGetEvent(admin)))).toBe(200);
  });

  it('reviews any report', async () => {
    const res = await reviewsPOST(reviewsPostEvent(admin, { reportId: REPORT_OTHER, decision: 'APPROVED', remarks: 'Matrix admin review.' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

describe('P0 tripwires (must flip to 403 in Phase 2)', () => {
  it.fails('HOD GET /api/reports is rejected instead of auto-creating a report', async () => {
    expect(await status(reportsGET(getEvent(hodCse, '/api/reports')))).toBe(403);
  });

  it.fails('HOD POST /api/reports is rejected instead of creating a report', async () => {
    const res = await reportsPOST(reportsPostEvent(hodCse, { reportId: 'matrix-hod-stray', completion: 0, status: 'DRAFT' }));
    expect(res.status).toBe(403);
  });
});
