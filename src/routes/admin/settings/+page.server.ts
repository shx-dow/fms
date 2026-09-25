import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { listPeriods, type ReportingPeriod } from '$lib/server/db/repositories/periods';

export interface PeriodSettingsData {
  periods: (ReportingPeriod & { label: string })[];
  openPeriod: {
    id: string;
    startsOn: string;
    endsOn: string;
    dueOnInput: string;
  } | null;
}

/** `2026-09-11T18:00:00+05:30` -> `2026-09-11T18:00` for a datetime-local input. */
function toLocalInput(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[1]}T${m[2]}:${m[3]}` : iso.slice(0, 16);
}

export const load = (({ locals }: Parameters<PageServerLoad>[0]): PeriodSettingsData => {
  if (locals.user?.role !== 'ADMIN') throw error(403, 'Only Admin may update reporting periods.');

  const periods = listPeriods().map((p) => ({ ...p, label: computeWeekLabel(String(p.starts_on)) }));
  const open = periods.find((p) => p.is_open) ?? null;
  return {
    periods,
    openPeriod: open
      ? { id: open.id, startsOn: open.starts_on, endsOn: open.ends_on, dueOnInput: toLocalInput(open.due_on) }
      : null,
  };
}) satisfies PageServerLoad;
