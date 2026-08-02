<script lang="ts">
  import '../app.css';
  import '../layout.css';
import { page } from '$app/state';
import { browser } from '$app/environment';
import Toast from '$lib/components/Toast.svelte';
import { show } from '$lib/stores/toast.svelte.ts';
import { onDestroy, onMount } from 'svelte';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import FileText from '@lucide/svelte/icons/file-text';
  import Building2 from '@lucide/svelte/icons/building-2';
  import Users from '@lucide/svelte/icons/users';
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import Cog from '@lucide/svelte/icons/cog';
  import History from '@lucide/svelte/icons/history';
  import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
  import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
  import Bell from '@lucide/svelte/icons/bell';
  import LogOut from '@lucide/svelte/icons/log-out';
  import KeyRound from '@lucide/svelte/icons/key-round';
  let { data, children } = $props();
  let sidebarCollapsed = $state(browser ? localStorage.getItem('sidebarCollapsed') === 'true' : false);
  let notifCount = $state(0);
  let showNotifications = $state(false);
  let showProfileMenu = $state(false);
  let showPasswordModal = $state(false);
  let pwCurrent = $state('');
  let pwNext = $state('');
  let pwConfirm = $state('');
  let pwSaving = $state(false);
  let pwError = $state('');
  let showCount = $state(6);
  let notifications = $state<{ id: string; actor_id: string; action: string; actor_name: string; created_at: string; is_read: number }[]>([]);
  let knownIds = $state(new Set<string>());
  let notifPollTimer: ReturnType<typeof setInterval> | undefined;
  const user = $derived(data.user);
  const roleLabel = $derived(user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'HOD' ? 'HOD' : 'Faculty');
  const avatarLetter = $derived(user?.name?.charAt(0)?.toUpperCase() ?? 'U');
  const visible = $derived(notifications.slice(0, showCount));
  const hasMore = $derived(showCount < notifications.length);
  function closeNotifs(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.notif-corner')) showNotifications = false;
    if (!target.closest('.profile-wrap')) showProfileMenu = false;
  }
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }
  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      const d = await res.json();
      const list = d.notifications ?? [];
      if (knownIds.size > 0) {
        const newOnes = list.filter((n: any) => !knownIds.has(n.id) && n.actor_id !== user?.id);
        for (const n of newOnes) {
          const label = n.action === 'REPORT_SUBMITTED'
            ? `${n.actor_name ?? 'Someone'} submitted a report`
            : notifLabel(n.action);
          show(`${label} — ${fmtDate(n.created_at)}`, 'info', undefined, 4000);
        }
      }
      notifications = list;
      knownIds = new Set(list.map((n: any) => n.id));
      notifCount = list.filter((n: any) => !n.is_read).length;
    } catch {}
  }
  function handleVisibility() {
    if (document.visibilityState === 'visible') fetchNotifications();
  }
  onMount(async () => {
    await fetchNotifications();
    notifPollTimer = setInterval(fetchNotifications, 5000);
    if (browser) {
      document.addEventListener('click', closeNotifs);
      document.addEventListener('visibilitychange', handleVisibility);
    }
  });
  onDestroy(() => {
    if (notifPollTimer) clearInterval(notifPollTimer);
    if (browser) {
      document.removeEventListener('click', closeNotifs);
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  });
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
  function openPasswordModal() {
    showProfileMenu = false;
    pwCurrent = '';
    pwNext = '';
    pwConfirm = '';
    pwError = '';
    showPasswordModal = true;
  }
  async function changePassword() {
    if (!pwCurrent || !pwNext || !pwConfirm) { pwError = 'Fill in all three fields.'; return; }
    if (pwNext !== pwConfirm) { pwError = 'New passwords do not match.'; return; }
    pwSaving = true;
    pwError = '';
    try {
      const res = await fetch('/api/me/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { pwError = d.error ?? 'Could not change password.'; return; }
      showPasswordModal = false;
      show('Password changed.', 'ok');
    } catch { pwError = 'Could not change password.'; }
    finally { pwSaving = false; }
  }
</script>

{#if page.url.pathname === '/login' || page.url.pathname.includes('/print')}
  {@render children()}
{:else}
  <div class="app-frame" class:sidebar-collapsed={sidebarCollapsed}>
    <aside class="app-sidebar">
      <div class="sidebar-top">
        <a class="sidebar-logo" href={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}>
          <span class="crest">I</span>
        </a>
        <button
          class="sidebar-toggle-top"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          onclick={toggleSidebar}
        >
          {#if sidebarCollapsed}
            <PanelLeftOpen size={18} />
          {:else}
            <PanelLeftClose size={18} />
          {/if}
        </button>
      </div>
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
          </nav>
        {/if}
        {#if user?.role === 'HOD' || user?.role === 'ADMIN'}
          <div class="sidebar-label sidebar-label-admin">Administration</div>
          <nav class="sidebar-nav">
            <a href="/admin" class:active={page.url.pathname === '/admin'}
              ><Building2 size={18} /><span class="nav-label">Department overview</span></a
            >
            {#if user?.role === 'ADMIN'}
              <a href="/admin/faculty" class:active={page.url.pathname.startsWith('/admin/faculty')}
                ><Users size={18} /><span class="nav-label">Faculty directory</span></a
              >
            {/if}
            <a href="/admin/reports" class:active={page.url.pathname.startsWith('/admin/reports')}
              ><ClipboardCheck size={18} /><span class="nav-label">Review queue</span></a
            >
            {#if user?.role === 'ADMIN'}
              <a href="/admin/settings" class:active={page.url.pathname.startsWith('/admin/settings')}
                ><Cog size={18} /><span class="nav-label">Reporting periods</span></a
              >
              <a href="/admin/audit" class:active={page.url.pathname.startsWith('/admin/audit')}
                ><History size={18} /><span class="nav-label">Audit history</span></a
              >
            {/if}
          </nav>
        {/if}
      </div>
      <div class="sidebar-footer">
        <div class="profile-wrap">
          <button
            class="sidebar-user"
            onclick={() => (showProfileMenu = !showProfileMenu)}
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
          >
            <span class="sidebar-user-avatar">{avatarLetter}</span>
            <span class="sidebar-user-info"
              ><strong>{user?.name ?? 'User'}</strong><small
                >{roleLabel}{user?.role === 'FACULTY'
                  ? ''
                  : ' · ' + (user?.role === 'HOD' ? user?.departmentId : 'Institute')}</small
              ></span
            >
          </button>
          {#if showProfileMenu}
            <div class="profile-popover" role="menu">
              <div class="profile-email">{user?.email}</div>
              <button class="profile-item" onclick={openPasswordModal} role="menuitem">
                <KeyRound size={15} /><span>Change password</span>
              </button>
            </div>
          {/if}
        </div>
        <a class="logout-link" href="/logout"><LogOut size={16} /><span class="nav-label">Sign out</span></a>
      </div>
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
  {#if showPasswordModal}
    <div class="pw-overlay" role="presentation" onclick={() => (showPasswordModal = false)} onkeydown={(e) => { if (e.key === 'Escape') showPasswordModal = false; }}>
      <div class="pw-dialog" role="dialog" aria-modal="true" aria-labelledby="pw-title" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h3 id="pw-title">Change password</h3>
        <p class="pw-sub">You will stay signed in. Use the new password next time.</p>
        <label class="pw-field">Current password<input type="password" bind:value={pwCurrent} autocomplete="current-password" onkeydown={(e) => { if (e.key === 'Enter') changePassword(); }} /></label>
        <label class="pw-field">New password<input type="password" bind:value={pwNext} autocomplete="new-password" onkeydown={(e) => { if (e.key === 'Enter') changePassword(); }} /></label>
        <label class="pw-field">Confirm new password<input type="password" bind:value={pwConfirm} autocomplete="new-password" onkeydown={(e) => { if (e.key === 'Enter') changePassword(); }} /></label>
        {#if pwError}<p class="pw-error" role="alert">{pwError}</p>{/if}
        <div class="pw-actions">
          <button class="pw-cancel" onclick={() => (showPasswordModal = false)}>Cancel</button>
          <button class="pw-submit" disabled={pwSaving} onclick={changePassword}>{pwSaving ? 'Saving…' : 'Update password'}</button>
        </div>
      </div>
    </div>
  {/if}
  <Toast />
{/if}

<style>
  
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
  .pill-sub { background: #8bbdd9; color: #1a5a7a; }
  .pill-ok { background: #7fbf97; color: #1a5a3a; }
  .pill-chg { background: #e09080; color: #7a3028; }
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
  .profile-wrap { position: relative; }
  .sidebar-user {
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;
    padding: 4px;
    transition: background 0.12s ease;
  }
  .sidebar-user:hover { background: #29465a; }
  .profile-popover {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 0;
    min-width: 210px;
    background: #17252d;
    border: 1px solid #2a4554;
    border-radius: 8px;
    padding: 6px;
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.35);
    z-index: 130;
  }
  .profile-email {
    font-size: 0.7rem;
    color: #aec6ce;
    padding: 8px 10px 6px;
    /*border-bottom: 1px solid #2a4554;*/
    margin-bottom: 4px;
    word-break: break-all;
  }
  .profile-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    border: 0;
    background: transparent;
    color: #e2eaed;
    font: inherit;
    font-size: 0.76rem;
    font-weight: 700;
    padding: 9px 10px;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s ease;
  }
  .profile-item:hover { background: #29465a; color: #ffffff; }
  .pw-overlay {
    position: fixed;
    inset: 0;
    background: rgba(23, 37, 45, 0.35);
    display: grid;
    place-items: center;
    z-index: 200;
  }
  .pw-dialog {
    background: #fdfcf9;
    border: 1px solid #dbe3e7;
    border-radius: 10px;
    padding: 26px 28px;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
  .pw-dialog h3 { margin: 0 0 4px; font-size: 1.05rem; color: #1b2b36; }
  .pw-sub { margin: 0 0 18px; color: #71818a; font-size: 0.78rem; }
  .pw-field { display: block; color: #667477; font-size: 0.72rem; font-weight: 700; margin-bottom: 12px; }
  .pw-field input {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-top: 5px;
    padding: 9px 10px;
    border: 1px solid #dbe3e7;
    border-radius: 5px;
    background: #fbfcfc;
    color: #1b2b36;
    font: inherit;
    font-size: 0.84rem;
  }
  .pw-field input:focus { outline: 2px solid rgba(20, 91, 120, 0.2); border-color: #aacfd7; }
  .pw-error { margin: 0 0 12px; color: #a84f42; font-size: 0.76rem; font-weight: 700; }
  .pw-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
  .pw-cancel {
    border: 1px solid #dbe3e7;
    border-radius: 6px;
    padding: 8px 13px;
    background: #fdfcf9;
    color: #667477;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s;
  }
  .pw-cancel:hover { background: #f0f3f3; }
  .pw-submit {
    border: 1px solid #17252d;
    border-radius: 6px;
    padding: 8px 14px;
    background: #17252d;
    color: #f4f6f5;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s;
  }
  .pw-submit:hover { background: #294a5a; }
  .pw-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>