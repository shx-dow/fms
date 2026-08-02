import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';
import { periodSchema } from '$lib/server/validation';
import { computeWeekLabel } from '$lib/week-label';
import { listPeriods, upsertPeriod, closeOtherOpenPeriods, deletePeriod } from '$lib/server/db/repositories/periods';
import { insertAuditEvent } from '$lib/server/db/repositories/audit';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const periods = listPeriods();
  for (const p of periods) p.label = computeWeekLabel(String(p.starts_on));
  return json({ periods });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may delete reporting periods.' }, { status: 403 });
  const id = url.searchParams.get('id');
  if (!id) return json({ ok: false, error: 'Missing period id.' }, { status: 400 });
  deletePeriod(id);
  insertAuditEvent({
    id: randomUUID(),
    actorId: locals.user.id,
    action: 'PERIOD_DELETED',
    entityType: 'REPORTING_PERIOD',
    entityId: id,
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may update reporting periods.' }, { status: 403 });
  const parsed = periodSchema.safeParse(await request.json());
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { id, startsOn, endsOn, dueOn, isOpen } = parsed.data;
  const label = computeWeekLabel(startsOn);
  upsertPeriod({ id, label, startsOn, endsOn, dueOn, isOpen });
  if (isOpen) closeOtherOpenPeriods(id);
  insertAuditEvent({
    id: randomUUID(),
    actorId: locals.user.id,
    action: 'PERIOD_UPDATED',
    entityType: 'REPORTING_PERIOD',
    entityId: id,
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true });
};
