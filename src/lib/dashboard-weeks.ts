import { reviewScope } from '$lib/server/api';
import { listWeeksAggregate, listWeeksForFaculty } from '$lib/server/db/repositories/report-weeks';
import { computeWeekLabel } from '$lib/week-label';
import type { Week } from '$lib/weeks';

interface UserScope {
  role: string;
  id?: string;
  departmentId?: string;
}

/** One faculty member's weeks, labelled, with their own report status per week. */
export function facultyWeeks(facultyId: string): Week[] {
  return listWeeksForFaculty(facultyId).map((w) => ({
    ...w,
    week_label: computeWeekLabel(String(w.starts_on)),
  }));
}

/** Department-wide weeks with a 0-4 completion level and an overdue flag. */
export function aggregateWeeks(user: UserScope, now = new Date()): Week[] {
  return listWeeksAggregate(reviewScope(user)).map((w) => {
    const total = Number(w.total) || 1;
    const ratio = (Number(w.submitted) + Number(w.approved)) / total;
    return {
      ...w,
      week_label: computeWeekLabel(String(w.starts_on)),
      level:
        Number(w.approved) === Number(w.total) ? 4 : ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : ratio > 0 ? 1 : 0,
      late: ratio < 1 && (!Number(w.is_open) || new Date(String(w.due_on)) < now) ? 1 : 0,
    };
  });
}
