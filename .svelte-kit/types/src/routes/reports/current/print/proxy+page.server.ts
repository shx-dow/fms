// @ts-nocheck
import { error } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { PageServerLoad } from './$types';

export const load = ({ locals }: Parameters<PageServerLoad>[0]) => {
  if (!locals.user) throw error(401, 'Sign in required');
  const report = sqlite
    .prepare(
      'SELECT r.*, u.name AS faculty_name, u.email AS faculty_email, p.label AS period_label FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id WHERE r.faculty_id = ? ORDER BY r.updated_at DESC LIMIT 1',
    )
    .get(locals.user.id) as Record<string, unknown> | undefined;
  if (!report) throw error(404, 'Report not found');
  return {
    report,
    teaching: sqlite.prepare('SELECT * FROM teaching_records WHERE report_id = ?').all(report.id),
    research: sqlite.prepare('SELECT * FROM research_records WHERE report_id = ?').all(report.id),
    duties: sqlite.prepare('SELECT * FROM institutional_duties WHERE report_id = ?').all(report.id),
    outreach: sqlite.prepare('SELECT * FROM outreach_records WHERE report_id = ?').all(report.id),
    reviews: sqlite
      .prepare(
        'SELECT rv.*, u.name AS reviewer_name FROM reviews rv JOIN users u ON u.id = rv.reviewer_id WHERE rv.report_id = ? ORDER BY rv.created_at DESC',
      )
      .all(report.id),
  };
};
