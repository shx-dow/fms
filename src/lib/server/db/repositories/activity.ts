import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';

export interface TeachingDbRow {
  id: string;
  report_id: string;
  course_code: string;
  course_name: string;
  program_level: string;
  class_type: string;
  scheduled: number;
  conducted: number;
  missed: number;
  missed_action: string | null;
  syllabus_completion: number | null;
  syllabus_lecture: number | null;
}

export interface ResearchDbRow {
  id: string;
  report_id: string;
  category: string;
  title: string;
  venue_or_agency: string | null;
  indexing_or_quality: string | null;
  role: string | null;
  status: string | null;
}

export interface DutyDbRow {
  id: string;
  report_id: string;
  name: string;
  role: string;
  activity: string | null;
  reach: string | null;
  outcome: string | null;
}

export interface OutreachDbRow {
  id: string;
  report_id: string;
  activity: string;
  audience: string | null;
  outcome: string | null;
  date: string | null;
}

export function listTeaching(reportId: string, db: Db = defaultDb): TeachingDbRow[] {
  // SAFETY: SELECT * from teaching_records matches TeachingDbRow; columns come from sqlite-schema.ts.
  return db.all(sql`SELECT * FROM teaching_records WHERE report_id = ${reportId}`) as TeachingDbRow[];
}

export function listResearch(reportId: string, db: Db = defaultDb): ResearchDbRow[] {
  // SAFETY: SELECT * from research_records matches ResearchDbRow; columns come from sqlite-schema.ts.
  return db.all(sql`SELECT * FROM research_records WHERE report_id = ${reportId} ORDER BY rowid`) as ResearchDbRow[];
}

export function listDuties(reportId: string, db: Db = defaultDb): DutyDbRow[] {
  // SAFETY: SELECT * from institutional_duties matches DutyDbRow; columns come from sqlite-schema.ts.
  return db.all(sql`SELECT * FROM institutional_duties WHERE report_id = ${reportId} ORDER BY rowid`) as DutyDbRow[];
}

export function listOutreach(reportId: string, db: Db = defaultDb): OutreachDbRow[] {
  // SAFETY: SELECT * from outreach_records matches OutreachDbRow; columns come from sqlite-schema.ts.
  return db.all(sql`SELECT * FROM outreach_records WHERE report_id = ${reportId} ORDER BY rowid`) as OutreachDbRow[];
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