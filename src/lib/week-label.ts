const WEEK1_START = new Date(2026, 7, 3);
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

function getMonday(d: Date): Date {
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
  const diff = Math.round((monday.getTime() - WEEK1_START.getTime()) / 86400000);
  const weekNum = Math.floor(diff / 7) + 1;
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return `Week ${weekNum} (${fmt(monday)} - ${fmt(friday)})`;
}
