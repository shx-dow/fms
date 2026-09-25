export interface Week {
  id: string;
  starts_on: string;
  ends_on: string;
  due_on: string;
  is_open: number;
  week_label: string;
  status?: string | null;
  completion?: number;
  total?: number;
  submitted?: number;
  approved?: number;
  level?: number;
  late?: number;
}

export interface WeekGroup {
  label: string;
  weeks: Week[];
}

export type WeeksMode = 'faculty' | 'reviewer';

export function weekYear(week: Week): number {
  return new Date(week.starts_on + 'T00:00:00').getFullYear();
}

export function weekYears(weeks: Week[]): number[] {
  return [...new Set(weeks.map(weekYear))].sort((a, b) => b - a);
}

export function activeWeekCount(weeks: Week[], year: number): number {
  return weeks.filter((w) => weekYear(w) === year).length;
}

export function groupWeeksByMonth(weeks: Week[], year: number): WeekGroup[] {
  const yearWeeks = weeks
    .filter((w) => weekYear(w) === year)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  const groups = new Map<string, WeekGroup>();
  for (const week of yearWeeks) {
    const date = new Date(week.starts_on + 'T00:00:00');
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const group = groups.get(key) ?? { label: date.toLocaleDateString('en-US', { month: 'short' }), weeks: [] };
    group.weeks.push(week);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function weekStatusLabel(status: string | null | undefined): string {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'SUBMITTED') return 'Submitted';
  if (status === 'CHANGES_REQUIRED') return 'Changes requested';
  if (status === 'DRAFT') return 'Draft';
  return 'Not started';
}

export function weekCellClass(mode: WeeksMode, week: Week): string {
  if (mode === 'faculty') {
    if (week.status === 'APPROVED') return 'c-approved';
    if (week.status === 'SUBMITTED') return 'c-submitted';
    if (week.status === 'CHANGES_REQUIRED') return 'c-changes';
    return 'c-none';
  }
  if (Number(week.level) === 4) return 'c-approved';
  if (Number(week.level) === 3) return 'c-submitted';
  if (Number(week.level) === 2) return 'c-draft';
  return 'c-none';
}

export function weekTip(mode: WeeksMode, week: Week): string {
  if (mode === 'faculty') {
    return week.status ? `${week.week_label} · ${weekStatusLabel(week.status)}` : week.week_label;
  }
  const done = Number(week.submitted) + Number(week.approved);
  const parts = [week.week_label, `${done}/${week.total} submitted`];
  if (Number(week.approved)) parts.push(`${week.approved} approved`);
  if (Number(week.late)) parts.push('overdue');
  return parts.join(' · ');
}
