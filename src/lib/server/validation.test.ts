import { describe, expect, it } from 'vitest';
import {
  createUserSchema,
  notificationUpdateSchema,
  periodSchema,
  reopenSchema,
  reportSaveSchema,
  updateUserSchema,
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

  it('requires remarks when requesting changes', () => {
    expect(reviewSchema.safeParse({ reportId: 'r-1', decision: 'CHANGES_REQUIRED' }).success).toBe(false);
    expect(reviewSchema.safeParse({ reportId: 'r-1', decision: 'CHANGES_REQUIRED', remarks: '  ' }).success).toBe(false);
    expect(reviewSchema.safeParse({ reportId: 'r-1', decision: 'CHANGES_REQUIRED', remarks: 'Fix the numbers' }).success).toBe(true);
    expect(reviewSchema.safeParse({ reportId: 'r-1', decision: 'APPROVED' }).success).toBe(true);
  });
});

describe('periodSchema', () => {
  const valid = { id: 'week-1', startsOn: '2026-09-07', endsOn: '2026-09-11', dueOn: '2026-09-11T18:00:00+05:30', isOpen: true };

  it('accepts a well-formed weekly period', () => {
    expect(periodSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unparseable dates', () => {
    expect(periodSchema.safeParse({ ...valid, startsOn: 'not-a-date' }).success).toBe(false);
    expect(periodSchema.safeParse({ ...valid, dueOn: '' }).success).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    const parsed = periodSchema.safeParse({ ...valid, endsOn: '2026-09-01' });
    expect(parsed.success).toBe(false);
  });

  it('allows a single-day period', () => {
    expect(periodSchema.safeParse({ ...valid, endsOn: '2026-09-07' }).success).toBe(true);
  });
});

describe('reopenSchema', () => {
  const base = { reportId: 'r-1', reason: 'Fix the numbers' };

  it('accepts a future expiry', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(reopenSchema.safeParse({ ...base, allowedUntil: future }).success).toBe(true);
  });

  it('rejects a past or unparseable expiry', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(reopenSchema.safeParse({ ...base, allowedUntil: past }).success).toBe(false);
    expect(reopenSchema.safeParse({ ...base, allowedUntil: 'soon' }).success).toBe(false);
    expect(reopenSchema.safeParse({ ...base, allowedUntil: '' }).success).toBe(false);
  });

  it('still requires a reason', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(reopenSchema.safeParse({ reportId: 'r-1', allowedUntil: future }).success).toBe(false);
  });
});

describe('user schemas', () => {
  const create = { action: 'CREATE', name: 'Jane Smith', email: 'jane@example.edu', role: 'FACULTY', password: 'longenough1' };

  it('accepts a well-formed create', () => {
    expect(createUserSchema.safeParse(create).success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(createUserSchema.safeParse({ ...create, email: 'jane@' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...create, email: '' }).success).toBe(false);
  });

  it('enforces the minimum password length in the schema', () => {
    expect(createUserSchema.safeParse({ ...create, password: 'short' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...create, password: 'exactly8' }).success).toBe(true);
  });

  it('validates an update password when one is supplied', () => {
    expect(updateUserSchema.safeParse({ action: 'UPDATE', userId: 'u-1' }).success).toBe(true);
    expect(updateUserSchema.safeParse({ action: 'UPDATE', userId: 'u-1', password: 'short' }).success).toBe(false);
    expect(updateUserSchema.safeParse({ action: 'UPDATE', userId: 'u-1', email: 'nope' }).success).toBe(false);
  });
});

describe('notificationUpdateSchema', () => {
  it('accepts a mark-all call and a real event id', () => {
    expect(notificationUpdateSchema.safeParse({}).success).toBe(true);
    expect(notificationUpdateSchema.safeParse({ eventId: 'e-1' }).success).toBe(true);
  });

  it('rejects an empty event id', () => {
    expect(notificationUpdateSchema.safeParse({ eventId: '' }).success).toBe(false);
  });
});
