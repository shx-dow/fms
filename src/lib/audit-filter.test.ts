import { describe, expect, it } from 'vitest';
import {
  AUDIT_PAGE_SIZE,
  fromBoundary,
  isRealDate,
  readAuditFilters,
  readAuditPage,
  toBoundary,
} from './audit-filter';

const query = (s: string) => new URLSearchParams(s);

describe('isRealDate', () => {
  it('accepts real calendar dates only', () => {
    expect(isRealDate('2026-09-07')).toBe(true);
    expect(isRealDate('2024-02-29')).toBe(true);
    expect(isRealDate('2026-13-01')).toBe(false);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('2023-02-29')).toBe(false);
    expect(isRealDate('07/09/2026')).toBe(false);
    expect(isRealDate('')).toBe(false);
  });
});

describe('readAuditFilters', () => {
  it('defaults to empty filters', () => {
    expect(readAuditFilters(query(''))).toEqual({ q: '', action: '', from: '', to: '' });
  });

  it('trims and caps free-text input', () => {
    const filters = readAuditFilters(query(`q=${'x'.repeat(200)}`));
    expect(filters.q).toHaveLength(120);
    expect(readAuditFilters(query('q=%20%20Jane%20%20')).q).toBe('Jane');
  });

  it('drops date filters that are not real dates', () => {
    const filters = readAuditFilters(query('from=2026-02-30&to=garbage'));
    expect(filters.from).toBe('');
    expect(filters.to).toBe('');
  });

  it('keeps valid date filters', () => {
    const filters = readAuditFilters(query('from=2026-01-01&to=2026-12-31'));
    expect(filters.from).toBe('2026-01-01');
    expect(filters.to).toBe('2026-12-31');
  });
});

describe('readAuditPage', () => {
  it('defaults to the first page', () => {
    expect(readAuditPage(query(''))).toBe(1);
    expect(readAuditPage(query('page='))).toBe(1);
  });

  it('clamps out-of-range and non-numeric values', () => {
    expect(readAuditPage(query('page=0'))).toBe(1);
    expect(readAuditPage(query('page=-3'))).toBe(1);
    expect(readAuditPage(query('page=abc'))).toBe(1);
    expect(readAuditPage(query('page=2.7'))).toBe(2);
    expect(readAuditPage(query('page=1e12'))).toBe(10_000);
  });
});

describe('filter boundaries', () => {
  it('spans the whole day for an inclusive range', () => {
    expect(fromBoundary('2026-09-07')).toBe('2026-09-07T00:00:00Z');
    expect(toBoundary('2026-09-07')).toBe('2026-09-07T23:59:59Z');
  });

  it('omits boundaries when no date is set', () => {
    expect(fromBoundary('')).toBeUndefined();
    expect(toBoundary('')).toBeUndefined();
  });
});

describe('page size', () => {
  it('is a positive constant', () => {
    expect(AUDIT_PAGE_SIZE).toBeGreaterThan(0);
  });
});
