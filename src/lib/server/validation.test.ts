import { describe, expect, it } from 'vitest';
import {
  researchRecordSchema,
  dutyRecordSchema,
  outreachRecordSchema,
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
