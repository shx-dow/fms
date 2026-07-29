<script lang="ts">
  import '../app.css';
  import '../layout.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  let { data, children } = $props();
  let notifCount = $state(0);
  let showNotifications = $state(false);
  let sidebarCollapsed = $state(false);
  let notifications = $state<{ id: string; action?: string; actor_name?: string; created_at?: string; is_read?: number }[]>([]);
  onMount(async () => {
    try {
      const res = await fetch('/api/notifications');
      const d = await res.json();
      notifCount = d.notifications?.filter((n: any) => !n.is_read).length ?? 0;
      notifications = d.notifications ?? [];
    } catch {}
  });
  const user = $derived(data.user);
  const roleLabel = $derived(user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'HOD' ? 'HOD' : 'Faculty');
  const avatarLetter = $derived(user?.name?.charAt(0)?.toUpperCase() ?? 'U');
</script>

{#if page.url.pathname === '/login' || page.url.pathname.includes('/print')}
  {@render children()}
{:else}
  <div class="app-frame" class:sidebar-collapsed={sidebarCollapsed}>
    <aside class="app-sidebar">
      <a class="institution-brand" href="/dashboard"><span class="crest">I</span><span><strong>ICFAI University</strong><small>Faculty Reporting · Jaipur</small></span></a>
      <button class="sidebar-toggle" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onclick={() => sidebarCollapsed = !sidebarCollapsed}><span>{sidebarCollapsed ? '→' : '←'}</span><em>{sidebarCollapsed ? 'Expand' : 'Collapse'}</em></button>
      <div class="sidebar-label">Workspace</div>
      <nav class="sidebar-nav">
        <a href="/dashboard" class:active={page.url.pathname === '/dashboard'}><span>▦</span>Dashboard</a>
        <a href="/reports" class:active={page.url.pathname.startsWith('/reports')}><span>▤</span>My reports</a>
        <a href="/calendar" class:active={page.url.pathname.startsWith('/calendar')}><span>▦</span>Report calendar</a>
        <div class="notification-nav"><button class:active={page.url.pathname.startsWith('/notifications')} onclick={() => showNotifications = !showNotifications}><span>◌</span>Notifications {#if notifCount > 0}<b>{notifCount}</b>{/if}</button>{#if showNotifications}<div class="notification-popover"><div class="notification-popover-head"><strong>Notifications</strong><a href="/notifications">View all</a></div>{#if notifications.length}{#each notifications.slice(0, 4) as notification}<a class="notification-item" href="/notifications"><strong>{notification.action?.replaceAll('_', ' ') ?? 'Report update'}</strong><small>{notification.actor_name ?? 'System'} · {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Recently'}</small></a>{/each}<button class="mark-read" onclick={async () => { await fetch('/api/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }); notifications = notifications.map((n) => ({ ...n, is_read: 1 })); notifCount = 0; }}>Mark all as read</button>{:else}<div class="notification-empty">You’re all caught up.</div>{/if}</div>{/if}</div>
      </nav>
      {#if user?.role === 'HOD' || user?.role === 'ADMIN'}
      <div class="sidebar-label sidebar-label-admin">Administration</div>
      <nav class="sidebar-nav">
        <a href="/admin" class:active={page.url.pathname === '/admin'}><span>◈</span>Department overview</a>
        <a href="/admin/faculty" class:active={page.url.pathname.startsWith('/admin/faculty')}><span>♙</span>Faculty directory</a>
        <a href="/admin/departments" class:active={page.url.pathname.startsWith('/admin/departments')}><span>▥</span>Departments</a>
        <a href="/admin/reports" class:active={page.url.pathname.startsWith('/admin/reports')}><span>☷</span>Review queue</a>
        <a href="/admin/settings" class:active={page.url.pathname.startsWith('/admin/settings')}><span>⚙</span>Reporting periods</a>
        <a href="/admin/audit" class:active={page.url.pathname.startsWith('/admin/audit')}><span>≡</span>Audit history</a>
      </nav>
      {/if}
      <div class="sidebar-footer">
        <a class="sidebar-user" href="/dashboard">
          <span class="sidebar-user-avatar">{avatarLetter}</span>
          <span class="sidebar-user-info"><strong>{user?.name ?? 'User'}</strong><small>{roleLabel}{user?.role === 'FACULTY' ? '' : ' · ' + (user?.role === 'HOD' ? user?.departmentId : 'All departments')}</small></span>
        </a>
        <a class="logout-link" href="/logout"><span>→</span>Sign out</a>
</div>
    </aside>
    <div class="app-main"><div class="mobile-bar"><a class="institution-brand" href="/dashboard"><span class="crest">I</span><strong>Faculty Reporting</strong></a><a href="/logout">Sign out</a></div>{@render children()}</div>
  </div>
{/if}

<style>
  .notification-nav{position:relative}.notification-nav>button{width:100%;display:flex;align-items:center;gap:11px;padding:10px 11px;border:0;border-radius:6px;background:transparent;color:#c8d5d9;text-align:left;font:inherit;font-size:.81rem;cursor:pointer}.notification-nav>button:hover,.notification-nav>button.active{background:#315a70;color:#f4f6f5}.notification-nav>button span{width:18px;color:#91c0ca;text-align:center}.notification-nav>button b{margin-left:auto;background:#d8edf0;color:#145b78;border-radius:99px;font-size:.64rem;padding:2px 6px}.notification-popover{position:absolute;left:calc(100% + 12px);top:-10px;width:310px;background:#fff;border:1px solid #d9e2df;border-radius:10px;box-shadow:0 15px 35px rgba(23,37,45,.18);color:#17252d;z-index:120;overflow:hidden}.notification-popover-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #e6edeb;font-size:.82rem}.notification-popover-head a{color:#145b78;font-size:.72rem;text-decoration:none}.notification-item{display:block;padding:12px 16px;border-bottom:1px solid #edf1ef;text-decoration:none}.notification-item:hover{background:#f4f6f5}.notification-item strong,.notification-item small{display:block}.notification-item strong{font-size:.77rem;color:#17252d}.notification-item small{margin-top:3px;color:#64747a;font-size:.7rem;line-height:1.4}.mark-read{margin:11px 16px 13px;border:0;background:transparent;color:#145b78;font:inherit;font-size:.73rem;font-weight:800;cursor:pointer}.notification-empty{padding:20px 16px;color:#64747a;font-size:.78rem}@media(max-width:680px){.notification-popover{position:fixed;left:12px;right:12px;top:58px;width:auto}}
  .sidebar-toggle{margin:-14px 8px 12px auto;border:0;background:transparent;color:#9ab8c0;font:inherit;font-size:.7rem;cursor:pointer;display:flex;align-items:center;gap:6px}.sidebar-toggle:hover{color:#f4f6f5}.sidebar-toggle em{font-style:normal}.sidebar-collapsed .app-sidebar{width:76px}.sidebar-collapsed .app-main{margin-left:76px}.sidebar-collapsed .institution-brand{justify-content:center;padding-inline:0}.sidebar-collapsed .institution-brand>span:last-child,.sidebar-collapsed .sidebar-label,.sidebar-collapsed .sidebar-nav a:not(.active)::after,.sidebar-collapsed .sidebar-nav a b,.sidebar-collapsed .sidebar-user-info,.sidebar-collapsed .logout-link{display:none}.sidebar-collapsed .sidebar-nav a,.sidebar-collapsed .notification-nav>button{justify-content:center;padding-inline:0}.sidebar-collapsed .sidebar-nav a span,.sidebar-collapsed .notification-nav>button span{width:auto}.sidebar-collapsed .sidebar-toggle{margin-right:0}.sidebar-collapsed .sidebar-footer{padding-inline:0}.sidebar-collapsed .sidebar-user{justify-content:center}.sidebar-collapsed .notification-popover{left:58px;top:-10px}@media(max-width:680px){.sidebar-collapsed .app-sidebar{display:none}.sidebar-collapsed .app-main{margin-left:0}}
</style>
