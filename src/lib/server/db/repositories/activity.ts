import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export function listTeaching(reportId: string, db: Db = defaultDb): Record<string, unknown>[] {
  return db.all(sql`SELECT * FROM teaching_records WHERE report_id = ${reportId}`) as Record<string, unknown>[];
}

export function listResearch(reportId: string, db: Db = defaultDb): Record<string, unknown>[] {
  return db.all(sql`SELECT * FROM research_records WHERE report_id = ${reportId} ORDER BY rowid`) as Record<string, unknown>[];
}

export function listDuties(reportId: string, db: Db = defaultDb): Record<string, unknown>[] {
  return db.all(sql`SELECT * FROM institutional_duties WHERE report_id = ${reportId} ORDER BY rowid`) as Record<string, unknown>[];
}

export function listOutreach(reportId: string, db: Db = defaultDb): Record<string, unknown>[] {
  return db.all(sql`SELECT * FROM outreach_records WHERE report_id = ${reportId} ORDER BY rowid`) as Record<string, unknown>[];
}

export interface ResearchRow {
  category: string;
  title: string;
  venueOrAgency: string | null;
  indexingOrQuality: string | null;
  role: string | null;
  status: string | null;
}

export function replaceResearch(reportId: string, records: ResearchRow[], db: Db = defaultDb) {
  db.transaction((tx) => {
    tx.run(sql`DELETE FROM research_records WHERE report_id = ${reportId}`);
    for (const r of records) {
      tx.run(sql`
        INSERT INTO research_records (id, report_id, category, title, venue_or_agency, indexing_or_quality, role, status)
        VALUES (${randomUUID()}, ${reportId}, ${r.category}, ${r.title}, ${r.venueOrAgency}, ${r.indexingOrQuality}, ${r.role}, ${r.status})
      `);
    }
  });
}

export interface DutyRow {
  name: string;
  role: string;
  activity: string | null;
  reach: string | null;
  outcome: string | null;
}

export function replaceDuties(reportId: string, records: DutyRow[], db: Db = defaultDb) {
  db.transaction((tx) => {
    tx.run(sql`DELETE FROM institutional_duties WHERE report_id = ${reportId}`);
    for (const r of records) {
      tx.run(sql`
        INSERT INTO institutional_duties (id, report_id, name, role, activity, reach, outcome)
        VALUES (${randomUUID()}, ${reportId}, ${r.name}, ${r.role}, ${r.activity}, ${r.reach}, ${r.outcome})
      `);
    }
  });
}

export interface OutreachRow {
  activity: string;
  audience: string | null;
  outcome: string | null;
  date: string | null;
}

export function replaceOutreach(reportId: string, records: OutreachRow[], db: Db = defaultDb) {
  db.transaction((tx) => {
    tx.run(sql`DELETE FROM outreach_records WHERE report_id = ${reportId}`);
    for (const r of records) {
      tx.run(sql`
        INSERT INTO outreach_records (id, report_id, activity, audience, outcome, date)
        VALUES (${randomUUID()}, ${reportId}, ${r.activity}, ${r.audience}, ${r.outcome}, ${r.date})
      `);
    }
  });
}
