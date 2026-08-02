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

export function getPeriod(id: string, db: Db = defaultDb): ReportingPeriod | undefined {
  return db.get(sql`SELECT * FROM reporting_periods WHERE id = ${id}`) as ReportingPeriod | undefined;
}

export function currentOpenPeriod(db: Db = defaultDb): ReportingPeriod | undefined {
  return db.get(sql`
    SELECT * FROM reporting_periods WHERE is_open = 1 ORDER BY starts_on DESC LIMIT 1
  `) as ReportingPeriod | undefined;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function ensureCurrentPeriod(db: Db = defaultDb): ReportingPeriod {
  const existing = currentOpenPeriod(db);
  if (existing) return existing;

  const now = new Date();
  const monday = getMonday(now);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const id = `week-${dateStr(monday)}`;
  const startsOn = dateStr(monday);
  const endsOn = dateStr(friday);
  const dueOn = `${endsOn}T18:00:00+05:30`;
  const label = '';

  db.run(sql`UPDATE reporting_periods SET is_open = 0 WHERE is_open = 1`);
  db.run(sql`
    INSERT INTO reporting_periods (id, label, kind, starts_on, ends_on, due_on, is_open)
    VALUES (${id}, ${label}, 'WEEKLY', ${startsOn}, ${endsOn}, ${dueOn}, 1)
    ON CONFLICT(id) DO UPDATE SET is_open = 1
  `);

  return db.get(sql`SELECT * FROM reporting_periods WHERE id = ${id}`) as ReportingPeriod;
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

export function deletePeriod(id: string, db: Db = defaultDb) {
  db.run(sql`DELETE FROM reporting_periods WHERE id = ${id}`);
}
