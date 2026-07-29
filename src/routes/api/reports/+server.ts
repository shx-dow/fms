import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';
import { currentPeriod, policyFor } from '$lib/server/report-policy';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const userId = locals.user.id;
  const period = currentPeriod();
  if (!period) return json({ error: 'No open reporting period.' }, { status: 409 });
  let report = sqlite
    .prepare('SELECT * FROM reports WHERE faculty_id = ? AND period_id = ? LIMIT 1')
    .get(userId, period.id) as Record<string, unknown> | undefined;
  if (!report) {
    const now = new Date().toISOString();
    const id = randomUUID();
    sqlite
      .prepare(
        'INSERT INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, userId, period.id, 'DRAFT', 0, now, now);
    report = sqlite.prepare('SELECT * FROM reports WHERE id = ?').get(id) as Record<string, unknown>;
  }
  const history = sqlite
    .prepare(
      'SELECT r.id, r.status, r.completion, r.updated_at, r.submitted_at, p.label AS period_label, p.starts_on, p.ends_on, p.due_on FROM reports r JOIN reporting_periods p ON p.id = r.period_id WHERE r.faculty_id = ? ORDER BY p.starts_on DESC',
    )
    .all(userId);
  return json({
    report,
    reports: history,
    policy: policyFor(report as { status: string; reopened_until?: string | null }),
    teaching: sqlite.prepare('SELECT * FROM teaching_records WHERE report_id = ?').all(report.id),
    research: sqlite.prepare('SELECT * FROM research_records WHERE report_id = ?').all(report.id),
    duties: sqlite.prepare('SELECT * FROM institutional_duties WHERE report_id = ?').all(report.id),
    outreach: sqlite.prepare('SELECT * FROM outreach_records WHERE report_id = ?').all(report.id),
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const payload = await request.json();
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const userId = locals.user.id;
  const period = currentPeriod();
  if (!period) return json({ ok: false, error: 'No open reporting period.' }, { status: 409 });
  const reportId = String(payload.reportId || randomUUID());
  const now = new Date().toISOString();
  sqlite
    .prepare(
      'INSERT OR IGNORE INTO reports (id, faculty_id, period_id, status, completion, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(reportId, userId, period.id, 'DRAFT', 0, now, now);
  const existing = sqlite
    .prepare('SELECT status, reopened_until FROM reports WHERE id = ? AND faculty_id = ?')
    .get(reportId, userId) as { status: string; reopened_until?: string | null } | undefined;
  if (!existing) return json({ ok: false, error: 'Report not found' }, { status: 404 });
  const policy = policyFor(existing, new Date(now));
  if (!policy.canEdit)
    return json(
      {
        ok: false,
        error: 'This report is closed or locked. Request an authorized reopening.',
      },
      { status: 423 },
    );
  if (payload.status === 'SUBMITTED') {
    const teaching = Array.isArray(payload.teaching) ? payload.teaching : [];
    const errors: string[] = [];
    if (!teaching.length) errors.push('Add at least one teaching record.');
    teaching.forEach((row: Record<string, unknown>, index: number) => {
      if (!row.courseCode || !row.courseName) errors.push(`Course ${index + 1}: course code and name are required.`);
      if (Number(row.conducted ?? 0) > Number(row.scheduled ?? 0))
        errors.push(`Course ${index + 1}: classes taken cannot exceed classes scheduled.`);
    });
    if (!String(payload.summary ?? '').trim()) errors.push('Add a weekly summary before submitting.');
    if (errors.length)
      return json(
        {
          ok: false,
          error: 'Please complete the submission checklist.',
          errors,
        },
        { status: 400 },
      );
  }
  sqlite
    .prepare(
      "UPDATE reports SET summary = ?, challenges = ?, next_goals = ?, completion = ?, updated_at = ?, status = ?, submitted_at = CASE WHEN ? = 'SUBMITTED' THEN ? ELSE submitted_at END WHERE id = ? AND faculty_id = ?",
    )
    .run(
      payload.summary ?? null,
      payload.challenges ?? null,
      payload.nextGoals ?? null,
      Number(payload.completion ?? 0),
      now,
      payload.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      payload.status,
      now,
      reportId,
      userId,
    );
  const aliases: Record<string, string> = {
    course_code: 'courseCode',
    course_name: 'courseName',
    program_level: 'programLevel',
    class_type: 'classType',
    missed_action: 'missedAction',
    syllabus_completion: 'syllabusCompletion',
    venue_or_agency: 'venueOrAgency',
    indexing_or_quality: 'indexingOrQuality',
  };
  const replace = (table: string, rows: Record<string, unknown>[], columns: string[]) => {
    sqlite.prepare(`DELETE FROM ${table} WHERE report_id = ?`).run(reportId);
    for (const row of rows ?? []) {
      const values = columns.map((column) => {
        const value = row[column] ?? row[aliases[column]];
        return ['scheduled', 'conducted', 'missed'].includes(column) ? Number(value ?? 0) : (value ?? null);
      });
      sqlite
        .prepare(
          `INSERT INTO ${table} (id, report_id, ${columns.join(', ')}) VALUES (?, ?, ${columns.map(() => '?').join(', ')})`,
        )
        .run(randomUUID(), reportId, ...values);
    }
  };
  replace('teaching_records', payload.teaching, [
    'course_code',
    'course_name',
    'program_level',
    'class_type',
    'scheduled',
    'conducted',
    'missed',
    'missed_action',
    'syllabus_completion',
  ]);
  sqlite
    .prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      randomUUID(),
      userId,
      payload.status === 'SUBMITTED' ? 'REPORT_SUBMITTED' : 'REPORT_SAVED',
      'REPORT',
      reportId,
      now,
    );
  return json({ ok: true, reportId });
};
