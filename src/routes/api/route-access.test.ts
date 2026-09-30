import { beforeAll, describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import type { User } from '$lib/domain';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, getReportForPeriod, setReportStatus } from '$lib/server/db/repositories/reports';
import { insertAttachment } from '$lib/server/db/repositories/attachments';
import { GET as reportsGET, POST as reportsPOST } from './reports/+server';
import { GET as reportGET } from './reports/[id]/+server';
import { GET as reviewsGET, POST as reviewsPOST } from './reviews/+server';
import { GET as attachmentsGET } from './attachments/+server';
import { GET as attachmentDownloadGET } from './attachments/[id]/+server';

// Phase 0 safety net: role × endpoint access contract (status codes only).
// Bodies are intentionally not asserted here except where noted; Phase 1/2
// may change bodies (e.g. HOD attachment list) while statuses must hold.

const NOW = '2099-01-06T10:00:00Z';
const PERIOD = 'matrix-week-1';
const REPORT_OWN = 'matrix-report-own'; // matrix-fac-1, dept matrix-cse
const REPORT_OTHER = 'matrix-report-other'; // matrix-fac-2, dept matrix-eee
const REPORT_HOD = 'matrix-report-hod'; // matrix-hod-1, dept matrix-cse

const faculty1: User = { id: 'matrix-fac-1', name: 'Matrix Fac One', email: 'matrix-fac-1@example.edu', role: 'FACULTY', departmentId: 'matrix-cse' };
const faculty2: User = { id: 'matrix-fac-2', name: 'Matrix Fac Two', email: 'matrix-fac-2@example.edu', role: 'FACULTY', departmentId: 'matrix-eee' };
const hodCse: User = { id: 'matrix-hod-cse', name: 'Matrix HOD CSE', email: 'matrix-hod-cse@example.edu', role: 'HOD', departmentId: 'matrix-cse' };
const hodEee: User = { id: 'matrix-hod-eee', name: 'Matrix HOD EEE', email: 'matrix-hod-eee@example.edu', role: 'HOD', departmentId: 'matrix-eee' };
const admin: User = { id: 'matrix-admin', name: 'Matrix Admin', email: 'matrix-admin@example.edu', role: 'ADMIN' };

// Handlers are wrapped by api(), so their event parameter is the generic
// RequestEvent rather than the route-specific generated one. The fabricated
// events below are declared per route to match what each handler accepts.
type ReportsEvent = RequestEvent<Record<string, string>, '/api/reports'>;
type ReportEvent = RequestEvent<{ id: string }, '/api/reports/[id]'>;
type ReviewsEvent = RequestEvent<Record<string, string>, '/api/reviews'>;
type AttachmentsEvent = RequestEvent<Record<string, string>, '/api/attachments'>;
type AttachmentDownloadEvent = RequestEvent<{ id: string }, '/api/attachments/[id]'>;

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
// SAFETY: fabricated RequestEvent surface; handlers under test read only locals/url/request/params.
const attachmentDownloadEvent = (user: User | null, id: string) =>
  ({ locals: { user }, params: { id } }) as AttachmentDownloadEvent;

// Every handler under test is wrapped by api(), which turns a guard rejection
// into the response it describes. Calling the handler directly therefore
// exercises the same conversion a real request goes through, so these
// assertions cannot pass on a status the server would never actually send.
async function shows(fn: () => Response | Promise<Response>, expected: number): Promise<Response> {
  const res = await fn();
  expect(res.status).toBe(expected);
  return res;
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
  insertReportOrIgnore({ id: REPORT_HOD, facultyId: hodCse.id, periodId: PERIOD, createdAt: NOW, updatedAt: NOW });
  setReportStatus(REPORT_HOD, 'SUBMITTED', NOW);
  const uploadDir = process.env.UPLOAD_DIR ?? 'data/uploads';
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, 'matrix-file.bin'), 'matrix-bytes');
  insertAttachment({ id: 'matrix-attachment-1', reportId: REPORT_OWN, ownerId: faculty1.id, filename: 'matrix.pdf', mimeType: 'application/pdf', size: 12, storageName: 'matrix-file.bin', createdAt: NOW });
});

describe('anonymous callers', () => {
  it('cannot read or write reports', async () => {
    await shows(() => reportsGET(getEvent(null, '/api/reports')), 401);
    await shows(() => reportsPOST(reportsPostEvent(null, { reportId: REPORT_OWN })), 401);
    await shows(() => reportGET(reportEvent(null, REPORT_OWN)), 401);
  });

  it('cannot reach reviews or attachments', async () => {
    // Anonymous callers are unauthenticated (401); authenticated non-reviewers get 403.
    await shows(() => reviewsGET(reviewsGetEvent(null)), 401);
    await shows(() => reviewsPOST(reviewsPostEvent(null, {})), 401);
    await shows(() => attachmentsGET(attachmentsEvent(null, REPORT_OWN)), 401);
  });
});

describe('faculty owner', () => {
  it('reads own report and saves drafts', async () => {
    await shows(() => reportsGET(getEvent(faculty1, '/api/reports')), 200);
    await shows(() => reportGET(reportEvent(faculty1, REPORT_OWN)), 200);
    const saved = await shows(() => reportsPOST(reportsPostEvent(faculty1, { reportId: REPORT_OWN, completion: 50, status: 'DRAFT' })), 200);
    expect(await saved.json()).toMatchObject({ ok: true });
  });

  it('cannot review reports', async () => {
    await shows(() => reviewsGET(reviewsGetEvent(faculty1)), 403);
    await shows(() => reviewsPOST(reviewsPostEvent(faculty1, { reportId: REPORT_OWN, decision: 'APPROVED' })), 403);
  });
});

describe('faculty cross-department read', () => {
  it('cannot read another faculty report', async () => {
    await shows(() => reportGET(reportEvent(faculty2, REPORT_OWN)), 403);
  });
});

describe('HOD in department scope', () => {
  it('reads scoped reports and the review queue', async () => {
    await shows(() => reportGET(reportEvent(hodCse, REPORT_OWN)), 200);
    const queue = await shows(() => reviewsGET(reviewsGetEvent(hodCse)), 200);
    expect(Array.isArray((await queue.json()).reports)).toBe(true);
  });

  it('approves a scoped report', async () => {
    const res = await shows(() => reviewsPOST(reviewsPostEvent(hodCse, { reportId: REPORT_OWN, decision: 'APPROVED', remarks: 'Matrix review.' })), 200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('lists attachments without a scope error', async () => {
    await shows(() => attachmentsGET(attachmentsEvent(hodCse, REPORT_OWN)), 200);
  });
});

describe('HOD and another department', () => {
  // Reviewing is institute-wide, but reading one report still follows the
  // department, so a head does not browse another department's file.
  it('cannot read an out-of-scope report', async () => {
    await shows(() => reportGET(reportEvent(hodEee, REPORT_OWN)), 403);
  });

  it('can still review it, because the queue is not department-scoped', async () => {
    const res = await shows(() => reviewsPOST(reviewsPostEvent(hodEee, { reportId: REPORT_OWN, decision: 'APPROVED' })), 200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

describe('HOD reviewing their own report', () => {
  // An HOD may review any report, including their own.
  it('is allowed, and appears in their own queue', async () => {
    const res = await shows(() => reviewsPOST(reviewsPostEvent(hodCse, { reportId: REPORT_HOD, decision: 'APPROVED', remarks: 'HOD self review.' })), 200);
    expect(await res.json()).toMatchObject({ ok: true });

    const queue = await shows(() => reviewsGET(reviewsGetEvent(hodCse)), 200);
    // SAFETY: the review queue endpoint always returns a reports array of rows.
    const { reports } = (await queue.json()) as { reports: { id: string }[] };
    expect(reports.map((r) => r.id)).toContain(REPORT_HOD);
  });
});

describe('admin', () => {
  // ADMIN manages the system and stays out of the reporting flow: it can read a
  // report to diagnose a problem, but it never reviews one.
  it('reads any report for troubleshooting', async () => {
    await shows(() => reportGET(reportEvent(admin, REPORT_OWN)), 200);
  });

  it('cannot reach the review queue or review anything', async () => {
    await shows(() => reviewsGET(reviewsGetEvent(admin)), 403);
    await shows(() => reviewsPOST(reviewsPostEvent(admin, { reportId: REPORT_OTHER, decision: 'APPROVED' })), 403);
  });
});

describe('attachment download follows report scope', () => {
  it('serves the file to the owner and the in-scope HOD', async () => {
    const own = await shows(() => attachmentDownloadGET(attachmentDownloadEvent(faculty1, 'matrix-attachment-1')), 200);
    expect(await own.text()).toBe('matrix-bytes');
    await shows(() => attachmentDownloadGET(attachmentDownloadEvent(hodCse, 'matrix-attachment-1')), 200);
  });

  it('rejects anonymous, cross-faculty, out-of-scope HOD, and missing ids', async () => {
    await shows(() => attachmentDownloadGET(attachmentDownloadEvent(null, 'matrix-attachment-1')), 401);
    await shows(() => attachmentDownloadGET(attachmentDownloadEvent(faculty2, 'matrix-attachment-1')), 403);
    await shows(() => attachmentDownloadGET(attachmentDownloadEvent(hodEee, 'matrix-attachment-1')), 403);
    await shows(() => attachmentDownloadGET(attachmentDownloadEvent(faculty1, 'matrix-nope')), 404);
  });
});

describe('report endpoints are open to every teaching role', () => {
  // A department head teaches, so they file a report like anyone else.
  it('lets an HOD read and write their own report', async () => {
    const res = await shows(() => reportsGET(getEvent(hodCse, '/api/reports')), 200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(getReportForPeriod(hodCse.id, PERIOD)).toBeDefined();
  });

  it('locks an HOD out of editing their own submitted report', async () => {
    // REPORT_HOD is seeded SUBMITTED, and a submitted report is locked for
    // everyone, including the head of the department who filed it.
    await shows(() => reportsGET(getEvent(hodCse, '/api/reports')), 200);
    await shows(
      () => reportsPOST(reportsPostEvent(hodCse, { reportId: REPORT_HOD, completion: 25, status: 'DRAFT' })),
      403,
    );
  });

  it('lets an HOD save their own draft', async () => {
    setReportStatus(REPORT_HOD, 'DRAFT', NOW);
    const loaded = await shows(() => reportsGET(getEvent(hodCse, '/api/reports')), 200);
    // SAFETY: the reports endpoint always returns an object with a report object
    // holding the row's string id, so the assertion matches the known shape.
    const body = (await loaded.json()) as { report: { id: string } };
    const res = await shows(
      () => reportsPOST(reportsPostEvent(hodCse, { reportId: body.report.id, completion: 25, status: 'DRAFT' })),
      200,
    );
    expect(await res.json()).toMatchObject({ ok: true, reportId: body.report.id });
  });

  // ADMIN is the director or dean: they review, and do not file a report.
  it('rejects admins', async () => {
    await shows(() => reportsGET(getEvent(admin, '/api/reports')), 403);
    await shows(() => reportsPOST(reportsPostEvent(admin, { reportId: 'matrix-admin-stray', completion: 0, status: 'DRAFT' })), 403);
    expect(getReportForPeriod(admin.id, PERIOD)).toBeUndefined();
  });
});
