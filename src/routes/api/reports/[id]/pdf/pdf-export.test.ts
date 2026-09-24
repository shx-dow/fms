import { beforeAll, describe, expect, it } from 'vitest';
import type { User } from '$lib/domain';
import { upsertDepartment } from '$lib/server/db/repositories/departments';
import { createUser } from '$lib/server/db/repositories/users';
import { upsertPeriod } from '$lib/server/db/repositories/periods';
import { insertReportOrIgnore, saveReport } from '$lib/server/db/repositories/reports';
import { replaceDuties, replaceOutreach, replaceResearch } from '$lib/server/db/repositories/activity';
import { insertReview } from '$lib/server/db/repositories/reviews';
import { GET as pdfGET } from './+server';

// Phase 0 safety net: the PDF renderer (501 lines, untested) must not crash
// once seeded with one row per section, and must keep its access contract.
// Column-width mismatches are visual; this guards function, not layout.

const NOW = '2099-02-06T10:00:00Z';
const REPORT = 'pdf-report-1';

const faculty1: User = { id: 'pdf-fac-1', name: 'PDF Fac One', email: 'pdf-fac-1@example.edu', role: 'FACULTY', departmentId: 'pdf-cse' };
const faculty2: User = { id: 'pdf-fac-2', name: 'PDF Fac Two', email: 'pdf-fac-2@example.edu', role: 'FACULTY', departmentId: 'pdf-eee' };
const hodCse: User = { id: 'pdf-hod-cse', name: 'PDF HOD CSE', email: 'pdf-hod-cse@example.edu', role: 'HOD', departmentId: 'pdf-cse' };
const hodEee: User = { id: 'pdf-hod-eee', name: 'PDF HOD EEE', email: 'pdf-hod-eee@example.edu', role: 'HOD', departmentId: 'pdf-eee' };

type PdfEvent = Parameters<typeof pdfGET>[0];

// SAFETY: fabricated RequestEvent surface; the handler reads only locals and params.
const pdfEvent = (user: User | null) => ({ locals: { user }, params: { id: REPORT } }) as PdfEvent;

async function pdfStatus(fn: () => Response | Promise<Response>): Promise<number> {
  try {
    return (await fn()).status;
  } catch (e) {
    // SAFETY: SvelteKit error() throws HttpError, whose status carries the contract.
    return (e as { status: number }).status;
  }
}

beforeAll(() => {
  upsertDepartment('pdf-cse', 'P-CSE', 'PDF CSE');
  upsertDepartment('pdf-eee', 'P-EEE', 'PDF EEE');
  for (const u of [faculty1, faculty2, hodCse, hodEee]) {
    createUser({ id: u.id, name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? null });
  }
  upsertPeriod({ id: 'pdf-week-1', label: 'PDF Week', startsOn: '2099-02-02', endsOn: '2099-02-06', dueOn: '2099-02-06T18:00:00+05:30', isOpen: true });
  insertReportOrIgnore({ id: REPORT, facultyId: faculty1.id, periodId: 'pdf-week-1', createdAt: NOW, updatedAt: NOW });
  saveReport({
    reportId: REPORT, userId: faculty1.id, now: NOW, summary: 'PDF week.', challenges: null, nextGoals: null,
    completion: 80, status: 'SUBMITTED',
    teaching: [{
      courseCode: 'CSE-301', courseName: 'Database Systems', programLevel: 'B.Tech', classType: 'Lecture',
      scheduled: 4, conducted: 4, missed: 0, missedAction: 'None', syllabusCompletion: 40,
    }],
  });
  replaceResearch(REPORT, [{ category: 'Journal Paper', title: 'Matrix indexing', venueOrAgency: 'Matrix Conf', indexingOrQuality: 'Scopus', role: 'Author', status: 'Published' }]);
  replaceDuties(REPORT, [{ name: 'Time-table committee', role: 'Member', activity: 'Slots', reach: 'Dept', outcome: 'Published' }]);
  replaceOutreach(REPORT, [{ activity: 'Guest lecture', audience: 'Students', outcome: 'Good', date: '2099-02-04' }]);
  insertReview({ id: 'pdf-review-1', reportId: REPORT, reviewerId: hodCse.id, decision: 'APPROVED', remarks: 'PDF review.', createdAt: NOW });
});

describe('weekly report PDF', () => {
  it('renders a non-empty PDF for the owner', async () => {
    const res = await pdfGET(pdfEvent(faculty1));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('weekly-report-');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1000);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('%PDF');
  });

  it('renders for the in-scope HOD', async () => {
    expect(await pdfStatus(() => pdfGET(pdfEvent(hodCse)))).toBe(200);
  });

  it('rejects anonymous, cross-faculty, and out-of-scope HOD callers', async () => {
    expect(await pdfStatus(() => pdfGET(pdfEvent(null)))).toBe(401);
    expect(await pdfStatus(() => pdfGET(pdfEvent(faculty2)))).toBe(403);
    expect(await pdfStatus(() => pdfGET(pdfEvent(hodEee)))).toBe(403);
  });
});
