import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { canAccessReport, canWriteReport } from '$lib/server/report-policy';
import { listOutreach, replaceOutreach } from '$lib/server/db/repositories/activity';
import { outreachRecordSchema } from '$lib/server/validation';

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const reportId = url.searchParams.get('reportId');
  if (!reportId) return json({ error: 'reportId required' }, { status: 400 });
  if (!canAccessReport(locals.user, reportId))
    return json({ ok: false, error: 'Report is outside your scope.' }, { status: 403 });
  return json({ records: listOutreach(reportId) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const reportId = typeof body.reportId === 'string' ? body.reportId : '';
  if (!reportId || !Array.isArray(body.records))
    return json({ ok: false, error: 'reportId and records array required' }, { status: 400 });
  if (!canWriteReport(locals.user, reportId))
    return json({ ok: false, error: 'You can only edit your own report while it is open.' }, { status: 403 });
  const parsed = z.array(outreachRecordSchema).safeParse(body.records);
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  replaceOutreach(reportId, parsed.data);
  return json({ ok: true });
};
