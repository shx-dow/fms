<script lang="ts">
  import { onMount } from 'svelte';
  let { data } = $props();
  let notifications: { id: string; action: string; entity_id: string; created_at: string; actor_name: string; is_read: number }[] = $state([]);
  let loading = $state(true);
  const user = $derived(data.user);
  onMount(async () => {
    try {
      const response = await fetch('/api/notifications');
      const d = await response.json();
      notifications = d.notifications ?? [];
    } catch {} finally { loading = false; }
  });
  function title(n: { action: string; actor_name: string }) {
    const labels: Record<string, string> = { REPORT_SAVED: 'Report draft saved', REPORT_SUBMITTED: 'Report submitted for review', APPROVED: 'Report approved', CHANGES_REQUIRED: 'Changes requested', REPORT_REOPENED: 'Report reopened' };
    const prefix = n.action === 'REPORT_SUBMITTED' || n.action === 'REPORT_SAVED' ? `${n.actor_name ?? 'A faculty member'} ` : n.action === 'APPROVED' || n.action === 'CHANGES_REQUIRED' ? '' : '';
    return prefix + (labels[n.action] ?? n.action.replaceAll('_', ' '));
  }
  function link(action: string) {
    if (action === 'REPORT_SUBMITTED') return user?.role === 'FACULTY' ? '/reports' : '/admin/reports';
    if (action === 'REPORT_SAVED') return '/reports/current';
    if (action === 'APPROVED') return '/dashboard';
    if (action === 'CHANGES_REQUIRED') return '/reports/current';
    if (action === 'REPORT_REOPENED') return '/reports/current';
    return null;
  }
  async function markAllRead() { await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }); notifications = notifications.map((notification) => ({ ...notification, is_read: 1 })); }
</script>
<svelte:head><title>Notifications · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell"><div class="breadcrumb">Faculty workspace <span>/</span> Notifications</div><div class="page-heading"><div><div class="eyebrow">Faculty reporting system</div><h1>Notifications</h1><p>Recent activity from your reporting workspace.</p></div><div class="notification-actions"><span class="period-chip">{notifications.length} event{notifications.length === 1 ? '' : 's'}</span>{#if notifications.some((n) => !n.is_read)}<button class="mark-all" onclick={markAllRead}>Mark all as read</button>{/if}</div></div><section class="notice-list">{#if loading}<div class="empty-notifications"><strong>Loading…</strong></div>{:else if !notifications.length}<div class="empty-notifications"><strong>No notifications yet.</strong><p>Report saves, submissions and review decisions will appear here.</p></div>{:else}{#each notifications as notification}<article class="notice" class:unread={!notification.is_read}><span class="notice-dot" class:dot-review={notification.action === 'APPROVED' || notification.action === 'CHANGES_REQUIRED'}></span><div><strong class="notice-title">{title(notification)}</strong><small class="notice-meta">{notification.actor_name ? `${notification.actor_name} · ` : ''}{new Date(notification.created_at).toLocaleString()}</small></div>{#if link(notification.action)}<a href={link(notification.action)!}>View →</a>{/if}</article>{/each}{/if}</section></main>
<style>.notification-actions{display:flex;align-items:center;gap:10px}.mark-all{border:0;background:transparent;color:#145b78;font:inherit;font-size:.74rem;font-weight:800;cursor:pointer}.notice-list{border:1px solid #dbe3e7;background:#fdfcf9;border-radius:7px;overflow:hidden}.notice{display:flex;align-items:center;gap:14px;padding:17px 20px;border-bottom:1px solid #e6ecee}.notice:last-child{border-bottom:0}.notice.unread{background:#f4f8f8}.notice-dot{width:8px;height:8px;border-radius:50%;background:#087f73;flex:none}.dot-review{background:#97651b}.notice-title{font-size:.82rem;display:block;margin-bottom:2px}.notice-meta{color:#87969c;font-size:.7rem;display:block}.notice a{margin-left:auto;color:#087f73;text-decoration:none;font-weight:750;font-size:.75rem;white-space:nowrap}.empty-notifications{padding:40px 20px;color:#71818a;font-size:.8rem}.empty-notifications strong{color:#1b2b36;display:block;margin-bottom:5px}@media(max-width:600px){.notification-actions{align-items:flex-start;flex-direction:column}.notice{display:grid;grid-template-columns:14px 1fr}.notice a{margin-left:0}}</style>
