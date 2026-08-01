import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAuditEvents } from '$lib/server/db/repositories/audit';

const PAGE_SIZE = 50;

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user || !['HOD', 'ADMIN'].includes(locals.user.role))
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const { events, total } = listAuditEvents(
    {
      search: url.searchParams.get('q') || undefined,
      action: url.searchParams.get('action') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
  );
  return json({ events, total, page, limit: PAGE_SIZE });
};
