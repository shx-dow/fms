import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { sqlite } from '$lib/server/local-db';
import type { RequestHandler } from './$types';
import { periodSchema } from '$lib/server/validation';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return json({
    periods: sqlite.prepare('SELECT * FROM reporting_periods ORDER BY starts_on DESC').all(),
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN')
    return json({ ok: false, error: 'Only Admin may update reporting periods.' }, { status: 403 });
  const parsed = periodSchema.safeParse(await request.json());
  if (!parsed.success)
    return json({ ok: false, error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 400 });
  const { id, label, startsOn, endsOn, dueOn, isOpen } = parsed.data;
  sqlite
    .prepare(
      'INSERT INTO reporting_periods (id, label, kind, starts_on, ends_on, due_on, is_open) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET label=excluded.label, starts_on=excluded.starts_on, ends_on=excluded.ends_on, due_on=excluded.due_on, is_open=excluded.is_open',
    )
    .run(id, label, 'WEEKLY', startsOn, endsOn, dueOn, isOpen ? 1 : 0);
  sqlite
    .prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), locals.user.id, 'PERIOD_UPDATED', 'REPORTING_PERIOD', id, new Date().toISOString());
  return json({ ok: true });
};
