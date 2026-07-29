<script lang="ts">
  import '../app.css';
  import '../layout.css';
import { page } from '$app/state';
import { browser } from '$app/environment';
import Toast from '$lib/components/Toast.svelte';
import { onDestroy, onMount } from 'svelte';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import FileText from '@lucide/svelte/icons/file-text';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Users from '@lucide/svelte/icons/users';
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import Cog from '@lucide/svelte/icons/cog';
  import History from '@lucide/svelte/icons/history';
  import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
  import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
  import Bell from '@lucide/svelte/icons/bell';
  import LogOut from '@lucide/svelte/icons/log-out';
  let { data, children } = $props();
  let sidebarCollapsed = $state(false);
  let notifCount = $state(0);
  let showNotifications = $state(false);
  let showCount = $state(6);
  let notifications = $state<{ id: string; action: string; actor_name: string; created_at: string; is_read: number }[]>([]);
  const user = $derived(data.user);
  const roleLabel = $derived(user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'HOD' ? 'HOD' : 'Faculty');
  const avatarLetter = $derived(user?.name?.charAt(0)?.toUpperCase() ?? 'U');
  const visible = $derived(notifications.slice(0, showCount));
  const hasMore = $derived(showCount < notifications.length);
  function closeNotifs(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.notif-corner')) showNotifications = false;
  }
  onMount(async () => {
    try {
      const res = await fetch('/api/notifications');
      const d = await res.json();
      notifCount = d.notifications?.filter((n: any) => !n.is_read).length ?? 0;
      notifications = d.notifications ?? [];
    } catch {}
    if (browser) document.addEventListener('click', closeNotifs);
  });
  onDestroy(() => { if (browser) document.removeEventListener('click', closeNotifs); });
  function notifLabel(action: string) {
    const labels: Record<string, string> = { REPORT_SUBMITTED: 'Submitted', APPROVED: 'Approved', CHANGES_REQUIRED: 'Changes', REPORT_REOPENED: 'Reopened' };
    return labels[action] ?? action.replaceAll('_', ' ');
  }
  function notifPill(action: string) {
    if (action === 'APPROVED') return 'pill-ok';
    if (action === 'CHANGES_REQUIRED') return 'pill-chg';
    return 'pill-sub';
  }
  async function toggleRead(n: { id: string; is_read: number }) {
    const wasRead = n.is_read;
    n.is_read = wasRead ? 0 : 1;
    notifCount = notifications.filter((x) => !x.is_read).length;
    await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventId: n.id, unread: wasRead ? 1 : 0 }) });
  }
  async function markAllRead() {
    await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    notifications = notifications.map((n) => ({ ...n, is_read: 1 }));
    notifCount = 0;
  }
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
</script>

{#if page.url.pathname === '/login' || page.url.pathname.includes('/print')}
  {@render children()}
{:else}
  <div class="app-frame" class:sidebar-collapsed={sidebarCollapsed}>
    <aside class="app-sidebar">
      <a class="institution-brand" href="/dashboard"
        ><span class="crest">I</span><span
          ><strong>ICFAI University</strong><small>Faculty Reporting · Jaipur</small></span
        ></a
      >
      <div class="sidebar-body">
        {#if user?.role !== 'ADMIN'}
          <div class="sidebar-label">Workspace</div>
          <nav class="sidebar-nav">
            <a href="/dashboard" class:active={page.url.pathname === '/dashboard'}
              ><LayoutDashboard size={18} /><span class="nav-label">Dashboard</span></a
            >
            <a href="/reports" class:active={page.url.pathname.startsWith('/reports')}
              ><FileText size={18} /><span class="nav-label">My reports</span></a
            >
            <a href="/calendar" class:active={page.url.pathname.startsWith('/calendar')}
              ><CalendarDays size={18} /><span class="nav-label">Calendar</span></a
            >
          </nav>
        {/if}
        {#if user?.role === 'HOD' || user?.role === 'ADMIN'}
          <div class="sidebar-label sidebar-label-admin">Administration</div>
          <nav class="sidebar-nav">
            <a href="/admin" class:active={page.url.pathname === '/admin'}
              ><Building2 size={18} /><span class="nav-label">Department overview</span></a
            >
            <a href="/admin/faculty" class:active={page.url.pathname.startsWith('/admin/faculty')}
              ><Users size={18} /><span class="nav-label">Faculty directory</span></a
            >
            <a href="/admin/departments" class:active={page.url.pathname.startsWith('/admin/departments')}
              ><GitBranch size={18} /><span class="nav-label">Departments</span></a
            >
            <a href="/admin/reports" class:active={page.url.pathname.startsWith('/admin/reports')}
              ><ClipboardCheck size={18} /><span class="nav-label">Review queue</span></a
            >
            <a href="/admin/settings" class:active={page.url.pathname.startsWith('/admin/settings')}
              ><Cog size={18} /><span class="nav-label">Reporting periods</span></a
            >
            <a href="/admin/audit" class:active={page.url.pathname.startsWith('/admin/audit')}
              ><History size={18} /><span class="nav-label">Audit history</span></a
            >
          </nav>
        {/if}
      </div>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <span class="sidebar-user-avatar">{avatarLetter}</span>
          <span class="sidebar-user-info"
            ><strong>{user?.name ?? 'User'}</strong><small
              >{roleLabel}{user?.role === 'FACULTY'
                ? ''
                : ' · ' + (user?.role === 'HOD' ? user?.departmentId : 'All departments')}</small
            ></span
          >
        </div>
        <a class="logout-link" href="/logout"><LogOut size={16} /><span class="nav-label">Sign out</span></a>
      </div>
      <button
        class="sidebar-toggle"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
        >{#if sidebarCollapsed}<PanelLeftOpen size={16} />{:else}<PanelLeftClose size={16} />{/if}</button
      >
    </aside>
    <div class="app-main">
      <div class="notif-corner">
        <button class="notif-btn" onclick={() => (showNotifications = !showNotifications)} aria-label="Notifications">
          <Bell size={20} />
          {#if notifCount > 0}<span class="notif-badge">{notifCount}</span>{/if}
        </button>
        {#if showNotifications}
          <div class="notif-popover">
            <div class="notif-head">
              <strong>Notifications</strong>
              <button class="notif-markall" onclick={markAllRead}>Mark all as read</button>
            </div>
            <div class="notif-scroll">
              {#if visible.length}
                {#each visible as n}
                  <div class="notif-row" class:unread={!n.is_read}>
                    <div class="notif-body">
                      <strong class:unread={!n.is_read}>{n.action === 'REPORT_SUBMITTED' ? `${n.actor_name ?? 'A faculty member'} submitted a report` : notifLabel(n.action)}</strong>
                      <div class="notif-meta">
                        <span class="notif-tag {notifPill(n.action)}">{notifLabel(n.action)}</span>
                        <span class="notif-time">{fmtDate(n.created_at)}</span>
                      </div>
                    </div>
                    <button class="notif-hover-act" class:show={!n.is_read} onclick={() => toggleRead(n)}>
                      {n.is_read ? 'Mark unread' : 'Mark read'}
                    </button>
                  </div>
                {/each}
                {#if hasMore}
                  <button class="notif-more" onclick={() => { showCount += 6; }}>Load more ({notifications.length - showCount} remaining)</button>
                {/if}
              {:else}
                <div class="notif-empty">You're all caught up.</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      {@render children()}
    </div>
  </div>
  <Toast />
{/if}

<style>
  .sidebar-toggle {
    border: 0;
    background: transparent;
    color: #7296a5;
    cursor: pointer;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
    border-top: 1px solid #2a4554;
    font: inherit;
    font-size: 0.7rem;
    transition: color 0.14s ease, background 0.14s ease;
    flex: none;
  }
  .sidebar-toggle:hover {
    color: #f4f6f5;
    background: #1f3744;
  }
  .notif-corner {
    position: absolute;
    top: 20px;
    right: 28px;
    z-index: 60;
  }
  .notif-btn {
    border: 0;
    background: transparent;
    cursor: pointer;
    position: relative;
    padding: 6px;
    display: grid;
    place-items: center;
    color: #4a656f;
    border-radius: 7px;
    transition: color 0.14s ease, background 0.14s ease;
  }
  .notif-btn:hover {
    color: #17252d;
    background: #dee8eb;
  }
  .notif-badge {
    position: absolute;
    top: -1px;
    right: -2px;
    background: #a84f42;
    color: #fff;
    font-size: 0.58rem;
    font-weight: 800;
    min-width: 15px;
    height: 15px;
    border-radius: 99px;
    display: grid;
    place-items: center;
    padding: 0 3px;
    line-height: 1;
  }
  .notif-popover {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    width: 380px;
    background: #fff;
    border: 1px solid #d9e2df;
    border-radius: 10px;
    box-shadow: 0 15px 35px rgba(23, 37, 45, 0.18);
    color: #17252d;
    z-index: 120;
    overflow: hidden;
  }
  .notif-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid #e6edeb;
  }
  .notif-head strong {
    font-size: 0.82rem;
  }
  .notif-markall {
    border: 0;
    background: transparent;
    color: #145b78;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 0;
  }
  .notif-markall:hover {
    text-decoration: underline;
  }
  .notif-scroll {
    max-height: 420px;
    overflow-y: auto;
  }
  .notif-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 16px;
    border-bottom: 1px solid #edf1ef;
    transition: background 0.1s;
  }
  .notif-row:hover {
    background: #f4f6f5;
  }
  .notif-row.unread {
    background: #f4f8f8;
  }
  .notif-body {
    min-width: 0;
    flex: 1;
  }
  .notif-body strong {
    display: block;
    font-size: 0.76rem;
    line-height: 1.3;
    margin-bottom: 3px;
  }
  .notif-body strong.unread {
    font-weight: 800;
  }
  .notif-body strong:not(.unread) {
    font-weight: 500;
    color: #667477;
  }
  .notif-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .notif-tag {
    flex: none;
    font-size: 0.55rem;
    font-weight: 800;
    padding: 2px 5px;
    border-radius: 3px;
    letter-spacing: 0.03em;
  }
  .pill-sub { background: #e5f0f4; color: #145b78; }
  .pill-ok { background: #e4f1eb; color: #24745b; }
  .pill-chg { background: #f4eddd; color: #8a681d; }
  .notif-time {
    color: #87969c;
    font-size: 0.65rem;
  }
  .notif-hover-act {
    flex: none;
    border: 0;
    background: transparent;
    color: #145b78;
    font: inherit;
    font-size: 0.68rem;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.1s, background 0.1s;
  }
  .notif-hover-act.show { opacity: 0; }
  .notif-row:hover .notif-hover-act { opacity: 1; }
  .notif-hover-act:hover { background: #e5f0f4; }
  .notif-more {
    width: 100%;
    border: 0;
    background: transparent;
    padding: 10px 16px;
    font: inherit;
    font-size: 0.72rem;
    color: #145b78;
    font-weight: 700;
    cursor: pointer;
    border-bottom: 1px solid #edf1ef;
    transition: background 0.1s;
  }
  .notif-more:hover {
    background: #eef3f5;
  }
  .notif-empty {
    padding: 24px 16px;
    color: #64747a;
    font-size: 0.78rem;
    text-align: center;
  }
  @media (max-width: 680px) {
    .sidebar-collapsed .app-sidebar {
      display: none;
    }
    .sidebar-collapsed .app-main {
      margin-left: 0;
    }
  }
</style>