import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  AUDIT_PAGE_SIZE,
  fromBoundary,
  readAuditFilters,
  readAuditPage,
  toBoundary,
  type AuditFilters,
} from '$lib/audit-filter';
import { listAuditEvents, type AuditEventsResult } from '$lib/server/db/repositories/audit';

export interface AuditLogData {
  events: AuditEventsResult['events'];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  filters: AuditFilters;
}

export const load = (({ locals, url }: Parameters<PageServerLoad>[0]): AuditLogData => {
  if (locals.user?.role !== 'ADMIN') throw error(403, 'Only Admin may view the audit log.');

  const filters = readAuditFilters(url.searchParams);
  const requested = readAuditPage(url.searchParams);
  const { events, total } = listAuditEvents({
    search: filters.q || undefined,
    action: filters.action || undefined,
    from: fromBoundary(filters.from),
    to: toBoundary(filters.to),
    limit: AUDIT_PAGE_SIZE,
    offset: (requested - 1) * AUDIT_PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  return {
    events,
    total,
    // A page past the end shows the last page rather than an empty table.
    page: Math.min(requested, pages),
    pages,
    pageSize: AUDIT_PAGE_SIZE,
    filters,
  };
}) satisfies PageServerLoad;
