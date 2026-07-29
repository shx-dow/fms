<script lang="ts">
  import '../app.css';
  import '../layout.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
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
  let { data, children } = $props();
  let sidebarCollapsed = $state(false);
  let notifCount = $state(0);
  let showNotifications = $state(false);
  let notifications = $state<
    { id: string; action?: string; actor_name?: string; created_at?: string; is_read?: number }[]
  >([]);
  const user = $derived(data.user);
  const roleLabel = $derived(user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'HOD' ? 'HOD' : 'Faculty');
  const avatarLetter = $derived(user?.name?.charAt(0)?.toUpperCase() ?? 'U');
  onMount(async () => {
    try {
      const res = await fetch('/api/notifications');
      const d = await res.json();
      notifCount = d.notifications?.filter((n: any) => !n.is_read).length ?? 0;
      notifications = d.notifications ?? [];
    } catch {}
  });
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
        <div class="sidebar-label">Workspace</div>
        <nav class="sidebar-nav">
          <a href="/dashboard" class:active={page.url.pathname === '/dashboard'}
            ><LayoutDashboard size={18} /><span class="nav-label">Dashboard</span></a
          >
          <a href="/reports" class:active={page.url.pathname.startsWith('/reports')}
            ><FileText size={18} /><span class="nav-label">My reports</span></a
          >
          <a href="/calendar" class:active={page.url.pathname.startsWith('/calendar')}
            ><CalendarDays size={18} /><span class="nav-label">Report calendar</span></a
          >
        </nav>
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
        <a class="logout-link" href="/logout">Sign out</a>
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
              <a href="/notifications">View all</a>
            </div>
            {#if notifications.length}
              {#each notifications.slice(0, 4) as notification}
                <a class="notif-item" href="/notifications">
                  <strong>{notification.action?.replaceAll('_', ' ') ?? 'Report update'}</strong>
                  <small>{notification.actor_name ?? 'System'} · {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Recently'}</small>
                </a>
              {/each}
              <button class="notif-mark" onclick={async () => {
                await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
                notifications = notifications.map((n) => ({ ...n, is_read: 1 }));
                notifCount = 0;
              }}>Mark all as read</button>
            {:else}
              <div class="notif-empty">You're all caught up.</div>
            {/if}
          </div>
        {/if}
      </div>
      {@render children()}
    </div>
  </div>
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
    width: 320px;
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
    font-size: 0.82rem;
  }
  .notif-head a {
    color: #145b78;
    font-size: 0.72rem;
    text-decoration: none;
  }
  .notif-item {
    display: block;
    padding: 12px 16px;
    border-bottom: 1px solid #edf1ef;
    text-decoration: none;
  }
  .notif-item:hover {
    background: #f4f6f5;
  }
  .notif-item strong,
  .notif-item small {
    display: block;
  }
  .notif-item strong {
    font-size: 0.77rem;
    color: #17252d;
  }
  .notif-item small {
    margin-top: 3px;
    color: #64747a;
    font-size: 0.7rem;
    line-height: 1.4;
  }
  .notif-mark {
    margin: 11px 16px 13px;
    border: 0;
    background: transparent;
    color: #145b78;
    font: inherit;
    font-size: 0.73rem;
    font-weight: 800;
    cursor: pointer;
  }
  .notif-empty {
    padding: 20px 16px;
    color: #64747a;
    font-size: 0.78rem;
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