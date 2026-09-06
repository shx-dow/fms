import { describe, expect, it } from 'vitest';
import {
  reportSaveSchema,
  researchRecordSchema,
  dutyRecordSchema,
  outreachRecordSchema,
  reviewSchema,
  teachingRecordSchema,
} from './validation';

describe('activity record schemas', () => {
  it('accepts a well-formed research record and defaults missing fields', () => {
    const parsed = researchRecordSchema.safeParse({
      category: 'Journal Paper',
      title: 'A paper',
      role: 'Lead author',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({ category: 'Journal Paper', title: 'A paper', role: 'Lead author' });
      expect(parsed.data.venueOrAgency).toBeNull();
      expect(parsed.data.indexingOrQuality).toBeNull();
      expect(parsed.data.status).toBeNull();
    }
  });

  it('rejects a research record with an invalid category', () => {
    const parsed = researchRecordSchema.safeParse({ category: 'Blog Post', title: 'x' });
    expect(parsed.success).toBe(false);
  });

  it('accepts a well-formed duty record', () => {
    const parsed = dutyRecordSchema.safeParse({ name: 'Exam Cell', role: 'Member' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.activity).toBeNull();
  });

  it('accepts a well-formed outreach record', () => {
    const parsed = outreachRecordSchema.safeParse({ activity: 'School visit', audience: 'Students' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.date).toBeNull();
  });
});

describe('teaching and report schemas', () => {
  it('coerces blank numeric fields and rejects out-of-range completion', () => {
    const blank = teachingRecordSchema.safeParse({
      courseCode: 'CSE-101',
      courseName: 'Intro',
      scheduled: '',
      conducted: '',
      missed: '',
      syllabusCompletion: '',
      syllabusLecture: '',
    });
    expect(blank.success).toBe(true);
    if (blank.success) {
      expect(blank.data.scheduled).toBe(0);
      expect(blank.data.syllabusCompletion).toBeNull();
    }
    const badCompletion = reportSaveSchema.safeParse({ completion: 101, teaching: [] });
    expect(badCompletion.success).toBe(false);
    const emptyCourse = teachingRecordSchema.safeParse({ courseCode: '', courseName: 'x' });
    expect(emptyCourse.success).toBe(false);
  });

  it('rejects invalid review decisions', () => {
    expect(reviewSchema.safeParse({ reportId: 'r-1', decision: 'MAYBE' }).success).toBe(false);
    expect(reviewSchema.safeParse({ reportId: 'r-1', decision: 'APPROVED' }).success).toBe(true);
  });
});
