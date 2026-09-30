import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../client';
import { ensureCurrentPeriod, getPeriod, upsertPeriod } from './periods';

const pad = (n: number) => String(n).padStart(2, '0');

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mondayOfThisWeek(): string {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return isoDate(monday);
}

function shiftDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function openPeriod(id: string, startsOn: string, endsOn: string) {
  upsertPeriod({ id, label: '', startsOn, endsOn, dueOn: `${endsOn}T18:00:00+05:30`, isOpen: true });
}

describe('ensureCurrentPeriod', () => {
  beforeEach(() => {
    db.run(sql`DELETE FROM reporting_periods`);
  });

  afterEach(() => {
    db.run(sql`DELETE FROM reporting_periods`);
  });

  // A period that never rolls over leaves every faculty member stuck on a closed
  // report once its week passes, with no way back in.
  it('opens the current week when the open period has ended', () => {
    openPeriod('ended-week', '2020-01-06', '2020-01-10');

    const period = ensureCurrentPeriod();

    expect(period.id).toBe(`week-${mondayOfThisWeek()}`);
    expect(period.is_open).toBe(1);
    expect(getPeriod('ended-week')?.is_open).toBe(0);
  });

  it('keeps an open period that has not ended', () => {
    openPeriod('covering-today', shiftDays(-2), shiftDays(2));

    expect(ensureCurrentPeriod().id).toBe('covering-today');
  });

  // An admin may move a period's dates; auto-rollover must not overrule that.
  it('keeps an open period an admin moved to cover today', () => {
    openPeriod('admin-extended', '2020-02-03', shiftDays(30));

    expect(ensureCurrentPeriod().id).toBe('admin-extended');
  });

  it('keeps a future period an admin pre-opened', () => {
    openPeriod('pre-opened', shiftDays(3), shiftDays(7));

    expect(ensureCurrentPeriod().id).toBe('pre-opened');
  });

  it('opens the current week when no period is open', () => {
    upsertPeriod({
      id: 'closed-week',
      label: '',
      startsOn: '2020-01-06',
      endsOn: '2020-01-10',
      dueOn: '2020-01-10T18:00:00+05:30',
      isOpen: false,
    });

    const period = ensureCurrentPeriod();

    expect(period.id).toBe(`week-${mondayOfThisWeek()}`);
    expect(period.is_open).toBe(1);
  });

  it('closes every other open period when it rolls over', () => {
    openPeriod('ended-a', '2020-01-06', '2020-01-10');
    openPeriod('ended-b', '2020-02-03', '2020-02-07');

    ensureCurrentPeriod();

    expect(getPeriod('ended-a')?.is_open).toBe(0);
    expect(getPeriod('ended-b')?.is_open).toBe(0);
  });
});
