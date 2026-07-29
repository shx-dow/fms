// @ts-nocheck
import { error } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { PageServerLoad } from './$types';

export const load = ({ locals }: Parameters<PageServerLoad>[0]) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const report = sqlite.prepare('SELECT r.*, p.label AS period_label FROM reports r JOIN reporting_periods p ON p.id = r.period_id WHERE r.faculty_id = ? ORDER BY r.updated_at DESC LIMIT 1').get(locals.user.id) as Record<string, unknown> | undefined;
  if (!report) throw error(404, 'Report not found');
  return { report, teaching: sqlite.prepare('SELECT * FROM teaching_records WHERE report_id = ?').all(report.id) };
};
