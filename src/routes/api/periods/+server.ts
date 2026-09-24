import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auditEvent, requireRole, requireUser } from '$lib/server/api';
import { periodSchema } from '$lib/server/validation';
import { computeWeekLabel } from '$lib/week-label';
import { listPeriods, upsertPeriod, closeOtherOpenPeriods, deletePeriod } from '$lib/server/db/repositories/periods';

export const GET: RequestHandler = ({ locals }) => {
  requireUser(locals);
  const periods = listPeriods();
  for (const p of periods) p.label = computeWeekLabel(String(p.starts_on));
  return json({ periods });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  const user = requireRole(requireUser(locals), 'ADMIN');
  const id = url.searchParams.get('id');
  if (!id) return json({ ok: false, error: 'Missing period id.' }, { status: 400 });
  try {
    deletePeriod(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete period.';
    return json({ ok: false, error: message }, { status: 409 });
  }
  auditEvent(user.id, 'PERIOD_DELETED', 'REPORTING_PERIOD', id);
  return json({ ok: true });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireRole(requireUser(locals), 'ADMIN');
  const parsed = periodSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { id, startsOn, endsOn, dueOn, isOpen } = parsed.data;
  const label = computeWeekLabel(startsOn);
  upsertPeriod({ id, label, startsOn, endsOn, dueOn, isOpen });
  if (isOpen) closeOtherOpenPeriods(id);
  auditEvent(user.id, 'PERIOD_UPDATED', 'REPORTING_PERIOD', id);
  return json({ ok: true });
};
