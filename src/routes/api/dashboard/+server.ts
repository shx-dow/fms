import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  const userId = locals.user?.id ?? 'dev-faculty-1';
  const report = sqlite.prepare("SELECT r.*, p.label, p.due_on FROM reports r JOIN reporting_periods p ON p.id = r.period_id WHERE r.faculty_id = ? ORDER BY p.starts_on DESC LIMIT 1").get(userId) as { id: string; completion: number; status: string; label: string; due_on: string } | undefined;
  if (!report) return json({ report: null, stats: { scheduled: 0, conducted: 0, syllabus: 0 } });
  const stats = sqlite.prepare('SELECT COALESCE(SUM(scheduled),0) AS scheduled, COALESCE(SUM(conducted),0) AS conducted, COALESCE(ROUND(AVG(syllabus_completion)),0) AS syllabus FROM teaching_records WHERE report_id = ?').get(report.id);
  return json({ report, stats });
};
