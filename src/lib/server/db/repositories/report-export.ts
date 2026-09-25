import { sql } from 'drizzle-orm';
import type { Db } from '../client';
import { db as defaultDb } from '../client';
import { getReportForPeriod, type ReportWithPeriod } from './reports';

export const MAX_EXPORT_TEACHING_ROWS = 10;

export interface ExportReportFilter {
  reportId?: string;
  periodId?: string;
  status?: string;
  submitted?: boolean;
}

export interface ExportTeachingRow {
  course_code: string;
  course_name: string;
  program_level: string;
  class_type: string;
  scheduled: number;
  conducted: number;
  missed: number;
  syllabus_lecture: number | null;
}

type ExportReportRow = ReportWithPeriod & { submitted_at: string | null };

function exportStatusMatches(status: string, filter: ExportReportFilter): boolean {
  if (filter.status && status !== filter.status) return false;
  if (filter.submitted === true && status !== 'SUBMITTED' && status !== 'APPROVED') return false;
  if (filter.submitted === false && (status === 'SUBMITTED' || status === 'APPROVED')) return false;
  return true;
}

export function getReportForExport(facultyId: string, filter: ExportReportFilter, db: Db = defaultDb) {
  if (filter.reportId) {
    // SAFETY: The SELECT list projects the export header columns plus period start for labeling.
    const row = db.get(sql`
      SELECT r.*, p.starts_on AS period_starts_on
      FROM reports r JOIN reporting_periods p ON p.id = r.period_id
      WHERE r.id = ${filter.reportId} AND r.faculty_id = ${facultyId} LIMIT 1
    `) as ExportReportRow | undefined;
    if (!row || !exportStatusMatches(String(row.status), filter)) return undefined;
    return row;
  }
  if (filter.periodId) {
    const row = getReportForPeriod(facultyId, filter.periodId, db);
    if (!row || !exportStatusMatches(String(row.status), filter)) return undefined;
    // SAFETY: getReportForPeriod returns ReportWithPeriod, which already carries the joined period columns.
    return row as ExportReportRow;
  }
  // SAFETY: The SELECT list projects the export header columns plus period start for labeling.
  const rows = db.all(sql`
    SELECT r.*, p.starts_on AS period_starts_on
    FROM reports r JOIN reporting_periods p ON p.id = r.period_id
    WHERE r.faculty_id = ${facultyId} ORDER BY r.updated_at DESC
  `) as ExportReportRow[];
  return rows.find((r) => exportStatusMatches(String(r.status), filter));
}

export function listExportTeaching(reportId: string, db: Db = defaultDb): ExportTeachingRow[] {
  // SAFETY: The SELECT list matches ExportTeachingRow (the exported teaching columns).
  return db.all(sql`
    SELECT course_code, course_name, program_level, class_type, scheduled, conducted, missed, syllabus_lecture
    FROM teaching_records WHERE report_id = ${reportId} ORDER BY rowid LIMIT ${MAX_EXPORT_TEACHING_ROWS}
  `) as ExportTeachingRow[];
}

export function countExportTeaching(reportId: string, db: Db = defaultDb): { total: number; scheduled: number; conducted: number } {
  // SAFETY: The COUNT/SUM expressions return numeric totals for the export footer.
  return db.get(sql`
    SELECT COUNT(*) AS total, COALESCE(SUM(scheduled),0) AS scheduled, COALESCE(SUM(conducted),0) AS conducted
    FROM teaching_records WHERE report_id = ${reportId}
  `) as { total: number; scheduled: number; conducted: number };
}
