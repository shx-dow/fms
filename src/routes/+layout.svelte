<script lang="ts">
  import '../app.css';
  import '../layout.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  let { data, children } = $props();
  let notifCount = $state(0);
  onMount(async () => {
    try {
      const res = await fetch('/api/notifications');
      const d = await res.json();
      notifCount = d.notifications?.length ?? 0;
    } catch {}
  });
  const user = $derived(data.user);
  const roleLabel = $derived(user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'HOD' ? 'HOD' : 'Faculty');
  const avatarLetter = $derived(user?.name?.charAt(0)?.toUpperCase() ?? 'U');
</script>

{#if page.url.pathname === '/login' || page.url.pathname.includes('/print')}
  {@render children()}
{:else}
  <div class="app-frame">
    <aside class="app-sidebar">
      <a class="institution-brand" href="/dashboard"><span class="crest">U</span><span><strong>University</strong><small>Faculty Reporting</small></span></a>
      <div class="sidebar-label">Workspace</div>
      <nav class="sidebar-nav">
        <a href="/dashboard" class:active={page.url.pathname === '/dashboard'}><span>▦</span>Dashboard</a>
        <a href="/reports" class:active={page.url.pathname.startsWith('/reports')}><span>▤</span>My reports</a>
        <a href="/calendar" class:active={page.url.pathname.startsWith('/calendar')}><span>▦</span>Report calendar</a>
        <a href="/notifications" class:active={page.url.pathname.startsWith('/notifications')}><span>◌</span>Notifications {#if notifCount > 0}<b>{notifCount}</b>{/if}</a>
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
    <div class="app-main"><div class="mobile-bar"><a class="institution-brand" href="/dashboard"><span class="crest">U</span><strong>Faculty Reporting</strong></a><a href="/logout">Sign out</a></div>{@render children()}</div>
  </div>
{/if}