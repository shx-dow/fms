import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { User } from '$lib/domain';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, getReportForPeriod } from '$lib/server/db/repositories/reports';
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

const faculty1: User = { id: 'matrix-fac-1', name: 'Matrix Fac One', email: 'matrix-fac-1@example.edu', role: 'FACULTY', departmentId: 'matrix-cse' };
const faculty2: User = { id: 'matrix-fac-2', name: 'Matrix Fac Two', email: 'matrix-fac-2@example.edu', role: 'FACULTY', departmentId: 'matrix-eee' };
const hodCse: User = { id: 'matrix-hod-cse', name: 'Matrix HOD CSE', email: 'matrix-hod-cse@example.edu', role: 'HOD', departmentId: 'matrix-cse' };
const hodEee: User = { id: 'matrix-hod-eee', name: 'Matrix HOD EEE', email: 'matrix-hod-eee@example.edu', role: 'HOD', departmentId: 'matrix-eee' };
const admin: User = { id: 'matrix-admin', name: 'Matrix Admin', email: 'matrix-admin@example.edu', role: 'ADMIN' };

type ReportsEvent = Parameters<typeof reportsGET>[0];
type ReportEvent = Parameters<typeof reportGET>[0];
type ReviewsEvent = Parameters<typeof reviewsGET>[0];
type AttachmentsEvent = Parameters<typeof attachmentsGET>[0];
type AttachmentDownloadEvent = Parameters<typeof attachmentDownloadGET>[0];

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

// Auth guards (requireUser/requireRole) throw their Response instead of
// returning it, so every invocation goes through call().
async function call(fn: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

async function shows(fn: () => Response | Promise<Response>, expected: number): Promise<Response> {
  const res = await call(fn);
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

describe('HOD outside department scope', () => {
  it('cannot read or review out-of-scope reports', async () => {
    await shows(() => reportGET(reportEvent(hodEee, REPORT_OWN)), 403);
    await shows(() => reviewsPOST(reviewsPostEvent(hodEee, { reportId: REPORT_OWN, decision: 'APPROVED' })), 403);
  });
});

describe('admin', () => {
  it('reads any report and the review queue', async () => {
    await shows(() => reportGET(reportEvent(admin, REPORT_OWN)), 200);
    await shows(() => reviewsGET(reviewsGetEvent(admin)), 200);
  });

  it('reviews any report', async () => {
    const res = await shows(() => reviewsPOST(reviewsPostEvent(admin, { reportId: REPORT_OTHER, decision: 'APPROVED', remarks: 'Matrix admin review.' })), 200);
    expect(await res.json()).toMatchObject({ ok: true });
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

describe('report endpoints are faculty-only', () => {
  it('rejects HOD readers without creating a report', async () => {
    await shows(() => reportsGET(getEvent(hodCse, '/api/reports')), 403);
    expect(getReportForPeriod(hodCse.id, PERIOD)).toBeUndefined();
  });

  it('rejects HOD writers without creating a report', async () => {
    await shows(() => reportsPOST(reportsPostEvent(hodCse, { reportId: 'matrix-hod-stray', completion: 0, status: 'DRAFT' })), 403);
    expect(getReportForPeriod(hodCse.id, PERIOD)).toBeUndefined();
  });

  it('rejects admins', async () => {
    await shows(() => reportsGET(getEvent(admin, '/api/reports')), 403);
    await shows(() => reportsPOST(reportsPostEvent(admin, { reportId: 'matrix-admin-stray', completion: 0, status: 'DRAFT' })), 403);
    expect(getReportForPeriod(admin.id, PERIOD)).toBeUndefined();
  });
});
