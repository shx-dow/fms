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
  import LogOut from '@lucide/svelte/icons/log-out';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import { setNotificationUser } from '$lib/stores/notifications.svelte';
  let { data, children } = $props();
  let sidebarCollapsed = $state(browser ? localStorage.getItem('sidebarCollapsed') === 'true' : false);
  let showProfileMenu = $state(false);
  let showPasswordModal = $state(false);
  let pwCurrent = $state('');
  let pwNext = $state('');
  let pwConfirm = $state('');
  let pwSaving = $state(false);
  let pwError = $state('');
  const user = $derived(data.user);
  const roleLabel = $derived(user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'HOD' ? 'HOD' : 'Faculty');
  const avatarLetter = $derived(user?.name?.charAt(0)?.toUpperCase() ?? 'U');
  function closeMenus(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.profile-wrap')) showProfileMenu = false;
  }
  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }
  $effect(() => {
    if (user) setNotificationUser(user.id);
  });
  onMount(() => {
    if (browser) {
      document.addEventListener('click', closeMenus);
    }
  });
  onDestroy(() => {
    if (browser) {
      document.removeEventListener('click', closeMenus);
    }
  });
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
          <img src="/icfaitech_jaipur_cover.webp" alt="IcfaiTech" class="sidebar-logo-img" />
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
  .sidebar-user:hover { background: var(--sidebar-hover); }
  .profile-popover {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 0;
    min-width: 210px;
    background: var(--navy);
    border: 1px solid var(--navy-3);
    border-radius: 8px;
    padding: 6px;
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.35);
    z-index: 130;
  }
  .profile-email {
    font-size: 0.7rem;
    color: var(--blue-soft);
    padding: 8px 10px 6px;
    /*border-bottom: 1px solid var(--navy-3);*/
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
    color: var(--sidebar-text);
    font: inherit;
    font-size: 0.76rem;
    font-weight: 700;
    padding: 9px 10px;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s ease;
  }
  .profile-item:hover { background: var(--sidebar-hover); color: #ffffff; }
  .pw-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    display: grid;
    place-items: center;
    z-index: 200;
  }
  .pw-dialog {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 26px 28px;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
  .pw-dialog h3 { margin: 0 0 4px; font-size: 1.05rem; color: var(--ink-2); }
  .pw-sub { margin: 0 0 18px; color: var(--muted-3); font-size: 0.78rem; }
  .pw-field { display: block; color: var(--muted); font-size: 0.72rem; font-weight: 700; margin-bottom: 12px; }
  .pw-field input {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-top: 5px;
    padding: 9px 10px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--bg-input);
    color: var(--ink-2);
    font: inherit;
    font-size: 0.84rem;
  }
  .pw-field input:focus { outline: 2px solid rgba(59, 130, 246, 0.15); border-color: var(--blue-icon); }
  .pw-error { margin: 0 0 12px; color: var(--red); font-size: 0.76rem; font-weight: 700; }
  .pw-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
  .pw-cancel {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px 13px;
    background: var(--panel);
    color: var(--muted);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s;
  }
  .pw-cancel:hover { background: var(--bg-hover); }
  .pw-submit {
    border: 1px solid var(--navy);
    border-radius: 6px;
    padding: 8px 14px;
    background: var(--navy);
    color: var(--paper);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.12s;
  }
  .pw-submit:hover { background: var(--blue-hover); }
  .pw-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>