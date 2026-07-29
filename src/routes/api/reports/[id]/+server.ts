import { json } from '@sveltejs/kit';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const reportId = params.id;
  const report = sqlite
    .prepare(
      'SELECT r.*, u.name AS faculty_name, u.email AS faculty_email, p.label AS period_label FROM reports r JOIN users u ON u.id = r.faculty_id JOIN reporting_periods p ON p.id = r.period_id WHERE r.id = ?',
    )
    .get(reportId) as Record<string, unknown> | undefined;
  if (!report) return json({ error: 'Report not found' }, { status: 404 });
  if (locals.user.role === 'FACULTY' && report.faculty_id !== locals.user.id)
    return json({ error: 'Forbidden' }, { status: 403 });
  if (locals.user.role === 'HOD') {
    const allowed = sqlite
      .prepare('SELECT 1 FROM reports r JOIN users u ON u.id = r.faculty_id WHERE r.id = ? AND u.department_id = ?')
      .get(reportId, locals.user.departmentId ?? '');
    if (!allowed) return json({ error: 'Report is outside your review scope.' }, { status: 403 });
  }
  return json({
    report,
    teaching: sqlite.prepare('SELECT * FROM teaching_records WHERE report_id = ?').all(reportId),
    research: sqlite.prepare('SELECT * FROM research_records WHERE report_id = ?').all(reportId),
    duties: sqlite.prepare('SELECT * FROM institutional_duties WHERE report_id = ?').all(reportId),
    outreach: sqlite.prepare('SELECT * FROM outreach_records WHERE report_id = ?').all(reportId),
    reviews: sqlite
      .prepare(
        'SELECT rv.*, u.name AS reviewer_name FROM reviews rv JOIN users u ON u.id = rv.reviewer_id WHERE rv.report_id = ? ORDER BY rv.created_at DESC',
      )
      .all(reportId),
  });
};
