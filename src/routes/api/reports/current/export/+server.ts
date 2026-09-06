import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { csvCell } from '$lib/server/csv';
import {
  MAX_EXPORT_TEACHING_ROWS,
  countExportTeaching,
  getReportForExport,
  listExportTeaching,
} from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const statusParam = url.searchParams.get('status');
  const submittedParam = url.searchParams.get('submitted');
  const report = getReportForExport(locals.user.id, {
    reportId: url.searchParams.get('reportId') ?? undefined,
    periodId: url.searchParams.get('period') ?? url.searchParams.get('periodId') ?? undefined,
    status: statusParam ?? undefined,
    submitted: submittedParam == null ? undefined : submittedParam === 'true',
  });
  if (!report) throw error(404, 'No report matches the requested period or status.');
  const rows = listExportTeaching(report.id);
  const totals = countExportTeaching(report.id);
  const truncated = totals.total > rows.length;
  const csv = [
    ['Report status', report.status],
    ['Total courses', String(totals.total)],
    ['Total scheduled', String(totals.scheduled)],
    ['Total conducted', String(totals.conducted)],
    ['Summary', ('summary' in report && report.summary) || ''],
    [],
    [
      'Course code',
      'Course name',
      'Program / level',
      'Class type',
      'Scheduled',
      'Conducted',
      'Missed',
      'Syllabus covered up to lecture no.',
    ],
    ...rows.map((row) => Object.values(row)),
    ...(truncated ? [[`Showing ${rows.length} of ${totals.total} courses (capped at ${MAX_EXPORT_TEACHING_ROWS})`, '', '', '', '', '', '', '']] : []),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="faculty-weekly-report.csv"',
    },
  });
};
