import { describe, expect, it } from 'vitest';
import {
  groupWeeksByMonth,
  weekCellClass,
  weekStatusLabel,
  weekTip,
  weekYears,
  type Week,
} from './weeks';

const week = (over: Partial<Week> = {}): Week => ({
  id: 'w1',
  starts_on: '2026-09-07',
  ends_on: '2026-09-11',
  due_on: '2026-09-11T18:00:00+05:30',
  is_open: 0,
  week_label: 'Week 1 of September',
  ...over,
});

describe('weekYears', () => {
  it('returns unique years newest first', () => {
    expect(weekYears([week({ starts_on: '2025-09-01' }), week({ starts_on: '2026-09-07' }), week({ starts_on: '2026-01-05' })])).toEqual([
      2026, 2025,
    ]);
  });

  it('is empty for no weeks', () => {
    expect(weekYears([])).toEqual([]);
  });
});

describe('groupWeeksByMonth', () => {
  it('groups the selected year by month label, oldest first', () => {
    const groups = groupWeeksByMonth(
      [
        week({ id: 'a', starts_on: '2026-09-14' }),
        week({ id: 'b', starts_on: '2026-08-03' }),
        week({ id: 'c', starts_on: '2026-08-10' }),
        week({ id: 'd', starts_on: '2025-09-01' }),
      ],
      2026,
    );
    expect(groups.map((g) => g.label)).toEqual(['Aug', 'Sep']);
    expect(groups[0].weeks.map((w) => w.id)).toEqual(['b', 'c']);
    expect(groups[1].weeks.map((w) => w.id)).toEqual(['a']);
  });
});

describe('weekStatusLabel', () => {
  it('labels every known status and falls back to not started', () => {
    expect(weekStatusLabel('APPROVED')).toBe('Approved');
    expect(weekStatusLabel('SUBMITTED')).toBe('Submitted');
    expect(weekStatusLabel('CHANGES_REQUIRED')).toBe('Changes requested');
    expect(weekStatusLabel('DRAFT')).toBe('Draft');
    expect(weekStatusLabel(null)).toBe('Not started');
  });
});

describe('weekCellClass', () => {
  it('uses the report status in faculty mode', () => {
    expect(weekCellClass('faculty', week({ status: 'APPROVED' }))).toBe('c-approved');
    expect(weekCellClass('faculty', week({ status: 'CHANGES_REQUIRED' }))).toBe('c-changes');
    expect(weekCellClass('faculty', week({ status: null }))).toBe('c-none');
  });

  it('uses the aggregate level in reviewer mode', () => {
    expect(weekCellClass('reviewer', week({ level: 4 }))).toBe('c-approved');
    expect(weekCellClass('reviewer', week({ level: 3 }))).toBe('c-submitted');
    expect(weekCellClass('reviewer', week({ level: 2 }))).toBe('c-draft');
    expect(weekCellClass('reviewer', week({ level: 0 }))).toBe('c-none');
  });
});

describe('weekTip', () => {
  it('describes the personal report in faculty mode', () => {
    expect(weekTip('faculty', week({ status: 'DRAFT' }))).toBe('Week 1 of September · Draft');
    expect(weekTip('faculty', week({ status: null }))).toBe('Week 1 of September');
  });

  it('describes department counts in reviewer mode', () => {
    const tip = weekTip('reviewer', week({ total: 5, submitted: 2, approved: 1, late: 1 }));
    expect(tip).toBe('Week 1 of September · 3/5 submitted · 1 approved · overdue');
  });
});
