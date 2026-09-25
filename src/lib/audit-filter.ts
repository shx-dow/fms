export const AUDIT_PAGE_SIZE = 50;

export interface AuditFilters {
  q: string;
  action: string;
  /** Plain yyyy-mm-dd values, as the date inputs hold them. */
  from: string;
  to: string;
}

export const AUDIT_DATE_INPUT_MIN = '0001-01-01';
export const AUDIT_DATE_INPUT_MAX = '9999-12-31';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A date input can only hold a real calendar date; reject the rest. */
export function isRealDate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const clampText = (value: string | null, max: number): string => (value ?? '').trim().slice(0, max);

/** Filters live in the URL, so paging and the back button stay honest. */
export function readAuditFilters(params: URLSearchParams): AuditFilters {
  const from = clampText(params.get('from'), 10);
  const to = clampText(params.get('to'), 10);
  return {
    q: clampText(params.get('q'), 120),
    action: clampText(params.get('action'), 60),
    from: isRealDate(from) ? from : '',
    to: isRealDate(to) ? to : '',
  };
}

export function readAuditPage(params: URLSearchParams): number {
  const raw = Number(params.get('page') ?? '1');
  if (!Number.isFinite(raw)) return 1;
  return Math.min(10_000, Math.max(1, Math.floor(raw)));
}

/** Lower bound of an inclusive `from` filter. */
export function fromBoundary(date: string): string | undefined {
  return date ? `${date}T00:00:00Z` : undefined;
}

/** Upper bound of an inclusive `to` filter. */
export function toBoundary(date: string): string | undefined {
  return date ? `${date}T23:59:59Z` : undefined;
}
