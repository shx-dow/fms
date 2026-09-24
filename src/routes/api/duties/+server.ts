import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { forbidden, requireUser } from '$lib/server/api';
import { canAccessReport, canWriteReport } from '$lib/server/report-policy';
import { listDuties, replaceDuties } from '$lib/server/db/repositories/activity';
import { setSectionEmpty } from '$lib/server/db/repositories/reports';
import { dutyRecordSchema, reportRecordsSchema } from '$lib/server/validation';

export const GET: RequestHandler = ({ locals, url }) => {
  const user = requireUser(locals);
  const reportId = url.searchParams.get('reportId');
  if (!reportId) return json({ ok: false, error: 'reportId required' }, { status: 400 });
  if (!canAccessReport(user, reportId)) return forbidden('Report is outside your scope.');
  return json({ records: listDuties(reportId) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireUser(locals);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = reportRecordsSchema.safeParse(body);
  if (!parsed.success)
    return json({ ok: false, error: 'reportId and records array required' }, { status: 400 });
  const reportId = parsed.data.reportId;
  if (!canWriteReport(user, reportId))
    return json({ ok: false, error: 'You can only edit your own report while it is open.' }, { status: 403 });
  const parsedRecords = z.array(dutyRecordSchema).safeParse(parsed.data.records);
  if (!parsedRecords.success)
    return json({ ok: false, error: parsedRecords.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  replaceDuties(reportId, parsedRecords.data);
  if (parsed.data.empty !== undefined) setSectionEmpty(reportId, 'duties', parsed.data.empty);
  return json({ ok: true });
};
