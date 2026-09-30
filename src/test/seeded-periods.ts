import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabase } from '../lib/server/local-db';
import { listPeriods } from '../lib/server/db/repositories/periods';

export interface SeededPeriods {
  previous: string;
  current: string;
  next: string;
}

export interface SeededPeriod {
  id: string;
  starts_on: string;
  ends_on: string;
  due_on: string;
  is_open: number;
}

/** The demo periods, by role instead of by id.
 *
 * The seed dates its periods from the current week, so the ids move every week.
 * Tests look the weeks up by position rather than hardcoding a date that is
 * stale by the next run. */
export function seededPeriods(): SeededPeriods {
  const ordered = seededPeriodList();
  // SAFETY: the seed writes exactly three periods (previous, current, next),
  // so the sorted list always has three entries in that order.
  const [previous, current, next] = ordered.map((period) => period.id);
  return { previous, current, next };
}

/** The open demo period, for tests that need its dates rather than its id. */
export function seededOpenPeriod(): SeededPeriod {
  const open = seededPeriodList().find((period) => period.is_open === 1);
  // SAFETY: the seed always writes exactly one period with is_open = 1.
  if (!open) throw new Error('seeded database has no open period');
  return open;
}

function seededPeriodList(): SeededPeriod[] {
  const db = drizzle(createDatabase({ filename: ':memory:', seed: true }));
  return [...listPeriods(db)].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
}
