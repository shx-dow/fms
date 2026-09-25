import { describe, expect, it } from 'vitest';
import type { TeachingRecord } from '$lib/domain';
import {
  autoSummary,
  computeCompletion,
  countActive,
  isNotApplicable,
  reviewNotes,
  stepDone,
  summariseTeaching,
  validStep,
  type ReportProgressInput,
} from './report-progress';

const blank: TeachingRecord = {
  courseCode: '',
  courseName: '',
  programLevel: '',
  classType: 'Lecture',
  scheduled: 0,
  conducted: 0,
  missed: 0,
  missedAction: '',
  syllabusCompletion: 0,
  syllabusLecture: 0,
};

const course = (over: Partial<TeachingRecord> = {}): TeachingRecord => ({
  ...blank,
  courseCode: 'CSE-301',
  courseName: 'DBMS',
  scheduled: 4,
  conducted: 4,
  ...over,
});

const emptyProgress: ReportProgressInput = {
  teaching: summariseTeaching([]),
  researchActive: 0,
  dutiesCount: 0,
  outreachCount: 0,
  attachmentCount: 0,
};

describe('validStep', () => {
  it('accepts known steps and rejects everything else', () => {
    expect(validStep('research')).toBe('research');
    expect(validStep('review')).toBe('review');
    expect(validStep('nope')).toBeNull();
    expect(validStep(null)).toBeNull();
  });
});

describe('summariseTeaching', () => {
  it('totals classes and the delivery rate', () => {
    const s = summariseTeaching([course({ scheduled: 4, conducted: 4 }), course({ courseCode: 'CSE-302', scheduled: 6, conducted: 3 })]);
    expect(s.scheduled).toBe(10);
    expect(s.conducted).toBe(7);
    expect(s.deliveryRate).toBe(70);
    expect(s.deliveryOk).toBe(false);
  });

  it('treats a 90% rate as delivery ok and an empty list as not ok', () => {
    expect(summariseTeaching([course({ scheduled: 10, conducted: 9 })]).deliveryOk).toBe(true);
    expect(summariseTeaching([]).deliveryOk).toBe(false);
    expect(summariseTeaching([]).deliveryRate).toBe(0);
  });

  it('requires both code and name for a valid entry', () => {
    expect(summariseTeaching([course()]).hasValidTeaching).toBe(true);
    expect(summariseTeaching([course({ courseName: '' })]).hasValidTeaching).toBe(false);
    expect(summariseTeaching([blank]).hasValidTeaching).toBe(false);
  });

  it('flags courses conducted beyond schedule but ignores blank rows', () => {
    expect(summariseTeaching([course({ conducted: 5 })]).overIndices).toEqual([0]);
    expect(summariseTeaching([blank, course({ conducted: 9 })]).overIndices).toEqual([1]);
    expect(summariseTeaching([blank]).overIndices).toEqual([]);
    expect(summariseTeaching([course({ conducted: 5 })]).teachingValid).toBe(false);
  });

  it('takes the furthest syllabus lecture', () => {
    expect(summariseTeaching([course({ syllabusLecture: 4 }), course({ courseCode: 'X', syllabusLecture: 11 })]).syllabusLecture).toBe(11);
  });
});

describe('countActive', () => {
  it('ignores blank rows and the N/A sentinel', () => {
    const rows = [{ title: 'Paper' }, { title: 'N/A' }, { title: '  ' }, { title: 'Other' }];
    expect(countActive(rows, (r) => r.title)).toBe(2);
  });
});

describe('isNotApplicable', () => {
  it('is true when flagged or when a sentinel row exists', () => {
    expect(isNotApplicable([{ name: 'a' }], (r) => r.name, true)).toBe(true);
    expect(isNotApplicable([{ name: 'N/A' }], (r) => r.name, false)).toBe(true);
    expect(isNotApplicable([{ name: 'a' }], (r) => r.name, false)).toBe(false);
  });
});

describe('computeCompletion', () => {
  it('is zero for an empty report', () => {
    expect(computeCompletion(emptyProgress)).toBe(10);
  });

  it('awards the full 100 for a complete report', () => {
    const progress: ReportProgressInput = {
      teaching: summariseTeaching([course({ scheduled: 4, conducted: 4, syllabusLecture: 3 })]),
      researchActive: 1,
      dutiesCount: 2,
      outreachCount: 0,
      attachmentCount: 1,
    };
    expect(computeCompletion(progress)).toBe(100);
  });

  it('never exceeds 100', () => {
    const progress: ReportProgressInput = {
      teaching: summariseTeaching([course(), course({ courseCode: 'B', scheduled: 4, conducted: 4 })]),
      researchActive: 5,
      dutiesCount: 5,
      outreachCount: 5,
      attachmentCount: 5,
    };
    expect(computeCompletion(progress)).toBeLessThanOrEqual(100);
  });
});

describe('reviewNotes', () => {
  const na = { researchNA: false, dutiesNA: false, outreachNA: false };

  it('reports an error for each over-scheduled course', () => {
    const notes = reviewNotes({
      ...emptyProgress,
      teaching: summariseTeaching([course({ conducted: 5 })]),
      ...na,
    });
    expect(notes.filter((n) => n.level === 'error')).toHaveLength(1);
    expect(notes[0].text).toContain('Course 1');
  });

  it('warns about every empty section', () => {
    const notes = reviewNotes({ ...emptyProgress, ...na });
    expect(notes.map((n) => n.step)).toEqual(['teaching', 'research', 'duties', 'outreach', 'files']);
    expect(notes.every((n) => n.level === 'warn')).toBe(true);
  });

  it('stays quiet on a section explicitly marked not applicable', () => {
    const notes = reviewNotes({ ...emptyProgress, researchNA: true, dutiesNA: true, outreachNA: true });
    expect(notes.map((n) => n.step)).toEqual(['teaching', 'files']);
  });
});

describe('stepDone', () => {
  const base = { ...emptyProgress, researchNA: false, dutiesNA: false, outreachNA: false };

  it('marks teaching done once a course has code and name', () => {
    expect(stepDone('teaching', { ...base, teaching: summariseTeaching([course()]) })).toBe(true);
    expect(stepDone('teaching', base)).toBe(false);
  });

  it('treats not-applicable sections as done', () => {
    expect(stepDone('research', { ...base, researchNA: true })).toBe(true);
    expect(stepDone('duties', { ...base, dutiesNA: true })).toBe(true);
    expect(stepDone('outreach', { ...base, outreachNA: true })).toBe(true);
  });

  it('marks files done only with an attachment', () => {
    expect(stepDone('files', { ...base, attachmentCount: 1 })).toBe(true);
    expect(stepDone('files', base)).toBe(false);
  });

  it('marks review done only when there are no notes', () => {
    const complete: ReportProgressInput = {
      teaching: summariseTeaching([course({ scheduled: 4, conducted: 4 })]),
      researchActive: 1,
      dutiesCount: 1,
      outreachCount: 1,
      attachmentCount: 1,
    };
    expect(stepDone('review', { ...complete, researchNA: false, dutiesNA: false, outreachNA: false })).toBe(true);
    expect(stepDone('review', { ...base })).toBe(false);
  });
});

describe('autoSummary', () => {
  it('describes delivery, courses, and counts', () => {
    const text = autoSummary({
      teaching: summariseTeaching([course({ scheduled: 4, conducted: 4 })]),
      researchActive: 2,
      dutiesCount: 1,
      outreachCount: 0,
      attachmentCount: 1,
      courseCount: 1,
    });
    expect(text).toContain('4 of 4 scheduled classes (100% delivery rate)');
    expect(text).toContain('across 1 course(s)');
    expect(text).toContain('2 research record(s) active');
    expect(text).toContain('1 institutional duty');
    expect(text).toContain('1 file(s) attached');
  });

  it('omits sections with nothing in them', () => {
    const text = autoSummary({ ...emptyProgress, courseCount: 0 });
    expect(text).not.toContain('research record');
    expect(text).not.toContain('file(s)');
  });
});
