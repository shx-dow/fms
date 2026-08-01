import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { computeWeekLabel } from '$lib/week-label';
import { listCalendar } from '$lib/server/db/repositories/reports';

export const GET: RequestHandler = ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const day = url.searchParams.get('date');
  const scope =
    locals.user.role === 'FACULTY'
      ? { facultyId: locals.user.id }
      : locals.user.role === 'HOD'
        ? { departmentId: locals.user.departmentId ?? '' }
        : {};
  const reports = listCalendar({ day: day ?? undefined, ...scope });
  for (const r of reports) r.period_label = computeWeekLabel(String(r.period_starts_on));
  return json({ reports });
};
