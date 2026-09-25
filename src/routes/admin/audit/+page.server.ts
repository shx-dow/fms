import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listAuditEvents, type AuditEventsResult } from '$lib/server/db/repositories/audit';

export const AUDIT_PAGE_SIZE = 50;

export interface AuditFilters {
  q: string;
  action: string;
  /** Plain yyyy-mm-dd values, as the date inputs hold them. */
  from: string;
  to: string;
}

export interface AuditLogData {
  events: AuditEventsResult['events'];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  filters: AuditFilters;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function readFilters(params: URLSearchParams): AuditFilters {
  const q = (params.get('q') ?? '').trim();
  const action = (params.get('action') ?? '').trim();
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  return {
    q: q.slice(0, 120),
    action: action.slice(0, 60),
    from: isRealDate(from) ? from : '',
    to: isRealDate(to) ? to : '',
  };
}

/** Filters live in the URL, so paging and the back button stay honest. */
function readPage(params: URLSearchParams): number {
  const raw = Number(params.get('page') ?? '1');
  if (!Number.isFinite(raw)) return 1;
  return Math.min(10_000, Math.max(1, Math.floor(raw)));
}

export const load = (({ locals, url }: Parameters<PageServerLoad>[0]): AuditLogData => {
  if (locals.user?.role !== 'ADMIN') throw error(403, 'Only Admin may view the audit log.');

  const filters = readFilters(url.searchParams);
  const requested = readPage(url.searchParams);
  const { events, total } = listAuditEvents({
    search: filters.q || undefined,
    action: filters.action || undefined,
    from: filters.from ? `${filters.from}T00:00:00Z` : undefined,
    to: filters.to ? `${filters.to}T23:59:59Z` : undefined,
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
