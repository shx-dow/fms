const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function computeWeekLabel(startsOn: string): string {
  const start = new Date(startsOn + 'T00:00:00');
  const day = start.getDay();
  if (day === 6) return 'Weekend (Saturday)';
  if (day === 0) return 'Weekend (Sunday)';
  const monday = getMonday(start);
  const weekOfMonth = Math.ceil(monday.getDate() / 7);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return `Week ${weekOfMonth} of ${fmtMonth(monday)} (${fmt(monday)} - ${fmt(friday)})`;
}
