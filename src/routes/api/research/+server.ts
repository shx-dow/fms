import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const reportId = locals.url?.searchParams.get('reportId');
  if (!reportId) return json({ error: 'reportId required' }, { status: 400 });
  return json({ records: sqlite.prepare('SELECT * FROM research_records WHERE report_id = ? ORDER BY rowid').all(reportId) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const { reportId, records } = await request.json();
  if (!reportId || !Array.isArray(records)) return json({ ok: false, error: 'reportId and records array required' }, { status: 400 });
  sqlite.prepare('DELETE FROM research_records WHERE report_id = ?').run(reportId);
  for (const r of records) {
    sqlite.prepare('INSERT INTO research_records (id, report_id, category, title, venue_or_agency, indexing_or_quality, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), reportId, r.category, r.title, r.venueOrAgency ?? null, r.indexingOrQuality ?? null, r.role ?? null, r.status ?? null);
  }
  return json({ ok: true });
};
