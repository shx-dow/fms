import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentExportReport, listExportTeaching } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const report = getCurrentExportReport(locals.user.id);
  if (!report) throw error(404, 'Report not found');
  const rows = listExportTeaching(report.id) as Record<string, unknown>[];
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    ['Report status', report.status],
    ['Summary', report.summary ?? ''],
    [],
    [
      'Course code',
      'Course name',
      'Program / level',
      'Class type',
      'Scheduled',
      'Conducted',
      'Missed',
      'Syllabus completion',
    ],
    ...rows.map((row) => Object.values(row)),
  ]
    .map((row) => row.map(escape).join(','))
    .join('\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="faculty-weekly-report.csv"',
    },
  });
};
