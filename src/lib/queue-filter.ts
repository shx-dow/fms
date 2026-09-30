/** Filters for the review queue and the "not submitted" list.
 *
 * They live in the URL so that a filtered view can be bookmarked or shared, and
 * so the download button can carry exactly the filters on screen. Without this
 * the CSV and the table could disagree, which is the usual way an export
 * becomes untrustworthy.
 */

export const QUEUE_STATUSES = ['SUBMITTED', 'CHANGES_REQUIRED', 'APPROVED'] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export interface QueueFilters {
  q: string;
  status: QueueStatus | '';
  /** '' means every reporting week. */
  period: string;
}

const clamp = (value: string | null, max: number): string => (value ?? '').trim().slice(0, max);

/** Only a known status may reach the query; anything else means "all". */
export function readStatus(value: string | null): QueueStatus | '' {
  const raw = clamp(value, 40).toUpperCase();
  const known: readonly string[] = QUEUE_STATUSES;
  if (!known.includes(raw)) return '';
  // SAFETY: the check above proves raw is one of QUEUE_STATUSES, so narrowing it
  // to the union cannot admit a status the query does not understand.
  return raw as QueueStatus;
}

export function readQueueFilters(params: URLSearchParams): QueueFilters {
  return {
    q: clamp(params.get('q'), 120),
    status: readStatus(params.get('status')),
    period: clamp(params.get('period'), 40),
  };
}

/** The query string that reproduces a filter set, for links and downloads. */
export function queueQuery(filters: QueueFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.period) params.set('period', filters.period);
  return params.toString();
}

/** The week a "not submitted" list refers to; '' means the open week. */
export function readMissingPeriod(params: URLSearchParams): string {
  return clamp(params.get('period'), 40);
}

export function missingQuery(period: string): string {
  return period ? `period=${encodeURIComponent(period)}` : '';
}
