import { error } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const report = sqlite
    .prepare('SELECT * FROM reports WHERE faculty_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(locals.user.id) as { id: string; status: string; summary?: string } | undefined;
  if (!report) throw error(404, 'Report not found');
  const rows = sqlite
    .prepare(
      'SELECT course_code, course_name, program_level, class_type, scheduled, conducted, missed, syllabus_completion FROM teaching_records WHERE report_id = ?',
    )
    .all(report.id) as Record<string, unknown>[];
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
