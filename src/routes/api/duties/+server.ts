import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessReport } from '$lib/server/report-policy';
import { listDuties, replaceDuties } from '$lib/server/db/repositories/activity';

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const reportId = url.searchParams.get('reportId');
  if (!reportId) return json({ error: 'reportId required' }, { status: 400 });
  if (!canAccessReport(locals.user, reportId))
    return json({ ok: false, error: 'Report is outside your scope.' }, { status: 403 });
  return json({ records: listDuties(reportId) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const { reportId, records } = await request.json();
  if (!reportId || !Array.isArray(records))
    return json({ ok: false, error: 'reportId and records array required' }, { status: 400 });
  if (!canAccessReport(locals.user, reportId))
    return json({ ok: false, error: 'Report is outside your scope.' }, { status: 403 });
  replaceDuties(reportId, records);
  return json({ ok: true });
};
