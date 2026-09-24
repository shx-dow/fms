import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole, requireUser } from '$lib/server/api';
import { listAuditEvents } from '$lib/server/db/repositories/audit';

const PAGE_SIZE = 50;

export const GET: RequestHandler = ({ locals, url }) => {
  requireRole(requireUser(locals), 'ADMIN');
  const rawPage = Number(url.searchParams.get('page') ?? '1');
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
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
