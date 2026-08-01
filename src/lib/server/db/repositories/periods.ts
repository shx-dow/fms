import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface ReportingPeriod {
  id: string;
  label: string;
  kind: string;
  starts_on: string;
  ends_on: string;
  due_on: string;
  is_open: number;
}

export function listPeriods(db: Db = defaultDb): Record<string, unknown>[] {
  return db.all(sql`SELECT * FROM reporting_periods ORDER BY starts_on DESC`) as Record<string, unknown>[];
}

export function currentOpenPeriod(db: Db = defaultDb): ReportingPeriod | undefined {
  return db.get(sql`
    SELECT * FROM reporting_periods WHERE is_open = 1 ORDER BY starts_on DESC LIMIT 1
  `) as ReportingPeriod | undefined;
}

export function upsertPeriod(
  fields: { id: string; label: string; startsOn: string; endsOn: string; dueOn: string; isOpen: boolean },
  db: Db = defaultDb,
) {
  db.run(sql`
    INSERT INTO reporting_periods (id, label, kind, starts_on, ends_on, due_on, is_open)
    VALUES (${fields.id}, ${fields.label}, 'WEEKLY', ${fields.startsOn}, ${fields.endsOn}, ${fields.dueOn}, ${fields.isOpen ? 1 : 0})
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label, starts_on = excluded.starts_on, ends_on = excluded.ends_on,
      due_on = excluded.due_on, is_open = excluded.is_open
  `);
}

export function closeOtherOpenPeriods(exceptId: string, db: Db = defaultDb) {
  db.run(sql`UPDATE reporting_periods SET is_open = 0 WHERE is_open = 1 AND id <> ${exceptId}`);
}
