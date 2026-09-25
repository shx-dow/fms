import { describe, expect, it } from 'vitest';
import {
  PDF_SECTIONS,
  dutyRow,
  formatSize,
  outreachRow,
  renderReportPdf,
  teachingRow,
  type ReportPdfData,
} from './pdf';

// Column parity is the regression this file exists for: a body row with more
// cells than headers silently rendered into an undefined column width (NaN).
const section = PDF_SECTIONS;

const teaching = teachingRow({
  course_code: 'CSE-301',
  course_name: 'DBMS',
  program_level: 'B.Tech',
  class_type: 'Lecture',
  scheduled: 4,
  conducted: 4,
  missed: 0,
  missed_action: 'None',
  syllabus_completion: 40,
  syllabus_lecture: 12,
});

const duty = dutyRow({ name: 'Committee', role: 'Member', activity: 'Slots', reach: 'Dept', outcome: 'Published' });
const outreach = outreachRow({ activity: 'Guest lecture', audience: 'Students', outcome: 'Good', date: '2099-02-04' });

describe('PDF section column parity', () => {
  it('teaching rows match their headers and widths', () => {
    expect(teaching).toHaveLength(section.teaching.headers.length);
    expect(section.teaching.widths).toHaveLength(section.teaching.headers.length);
    expect(teaching.at(-1)).toBe('L12 · 40%');
  });

  it('duty rows match their headers and widths', () => {
    expect(duty).toHaveLength(section.duties.headers.length);
    expect(section.duties.widths).toHaveLength(section.duties.headers.length);
    expect(duty).toContain('Published');
  });

  it('outreach rows match their headers and widths', () => {
    expect(outreach).toHaveLength(section.outreach.headers.length);
    expect(section.outreach.widths).toHaveLength(section.outreach.headers.length);
    expect(outreach).toContain('Good');
  });

  it('right-aligns only the numeric teaching columns', () => {
    expect(section.teaching.alignRight).toEqual([3, 4, 5]);
    expect(Math.max(...section.teaching.alignRight)).toBeLessThan(section.teaching.headers.length);
  });
});

describe('formatSize', () => {
  it('scales bytes to the largest fitting unit', () => {
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2 KB');
    expect(formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

const baseData: ReportPdfData = {
  report: {
    period_label: 'Week 1 of September (Mon - Fri)',
    status: 'APPROVED',
    faculty_name: 'Test Faculty',
    faculty_email: 'faculty@example.edu',
    department_name: 'Computer Science',
    completion: 80,
    submitted_at: '2099-02-06T12:00:00Z',
    summary: 'Week summary.',
    challenges: null,
    next_goals: null,
  },
  teaching: [],
  research: [],
  duties: [],
  outreach: [],
  reviews: [],
  attachments: [],
};

describe('renderReportPdf', () => {
  it('renders a PDF with empty sections', async () => {
    const pdf = await renderReportPdf(baseData);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('renders every populated section', async () => {
    const pdf = await renderReportPdf({
      ...baseData,
      teaching: [
        {
          course_code: 'CSE-301',
          course_name: 'DBMS',
          program_level: 'B.Tech',
          class_type: 'Lecture',
          scheduled: 4,
          conducted: 4,
          missed: 0,
          missed_action: 'None',
          syllabus_completion: 40,
          syllabus_lecture: 12,
        },
      ],
      research: [{ title: 'Paper', category: 'Journal', status: 'Published', venue_or_agency: 'Conf', indexing_or_quality: null, role: null }],
      duties: [{ name: 'Committee', role: 'Member', activity: 'Slots', reach: 'Dept', outcome: 'Published' }],
      outreach: [{ activity: 'Guest lecture', audience: 'Students', outcome: 'Good', date: '2099-02-04' }],
      reviews: [{ decision: 'APPROVED', remarks: 'Nice', reviewer_name: 'HOD', created_at: '2099-02-06T12:00:00Z' }],
      attachments: [{ filename: 'evidence.pdf', size: 2048, created_at: '2099-02-06T12:00:00Z' }],
    });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
