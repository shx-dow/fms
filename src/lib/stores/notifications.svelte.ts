import { show } from './toast.svelte';

type Notification = { id: string; actor_id: string; action: string; actor_name: string; created_at: string; is_read: number };

let notifications = $state<Notification[]>([]);
let knownIds = new Set<string>();
let userId: string | null = null;

export function setNotificationUser(id: string | null) {
  userId = id;
}

function notifLabel(action: string) {
  const labels = { REPORT_SUBMITTED: 'Submitted', APPROVED: 'Approved', CHANGES_REQUIRED: 'Changes', REPORT_REOPENED: 'Reopened' } satisfies Record<string, string>;
  // SAFETY: known notification actions map to labels; unknown values fall back via ??.
  return labels[action as keyof typeof labels] ?? action.replaceAll('_', ' ');
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export async function fetchNotifications() {
  try {
    const res = await fetch('/api/notifications');
    const d = await res.json();
    const list: Notification[] = d.notifications ?? [];
    if (knownIds.size > 0) {
      const newOnes = list.filter((n) => !knownIds.has(n.id) && n.actor_id !== userId);
      for (const n of newOnes) {
        const label = n.action === 'REPORT_SUBMITTED' ? `${n.actor_name ?? 'Someone'} submitted a report` : notifLabel(n.action);
        show(`${label} — ${fmtDate(n.created_at)}`, 'info', undefined, 4000);
      }
    }
    notifications = list;
    knownIds = new Set(list.map((n) => n.id));
  } catch {}
}

export async function toggleRead(n: Notification) {
  const wasRead = n.is_read;
  n.is_read = wasRead ? 0 : 1;
  await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventId: n.id, unread: wasRead ? 1 : 0 }) });
}

export async function markAllRead() {
  await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  notifications = notifications.map((n) => ({ ...n, is_read: 1 }));
}

export function notifPill(action: string) {
  if (action === 'APPROVED') return 'pill-ok';
  if (action === 'CHANGES_REQUIRED') return 'pill-chg';
  return 'pill-sub';
}

export function getNotifications() { return notifications; }
export function getNotifCount() { return notifications.filter((n) => !n.is_read).length; }
export { notifLabel, fmtDate };
