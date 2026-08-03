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
  import Repeat2 from '@lucide/svelte/icons/repeat-2';
  import { setNotificationUser } from '$lib/stores/notifications.svelte';
  let { data, children } = $props();
  let sidebarCollapsed = $state(browser ? localStorage.getItem('sidebarCollapsed') === 'true' : false);
  let showProfileMenu = $state(false);
  let showPasswordModal = $state(false);
  let showProfileModal = $state(false);
  let profileSaving = $state(false);
  let profileError = $state('');
  let profileSubjects = $state<any[]>([]);
  let profileResearch = $state<any[]>([]);
  let profileDuties = $state<any[]>([]);
  let profileOutreach = $state<any[]>([]);
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
  async function openProfileModal() {
    showProfileMenu = false;
    profileError = '';
    try {
      const res = await fetch('/api/me/profile');
      const d = await res.json();
      profileSubjects = d.profile?.subjects ?? [];
      profileResearch = d.profile?.research ?? [];
      profileDuties = d.profile?.duties ?? [];
      profileOutreach = d.profile?.outreach ?? [];
      showProfileModal = true;
    } catch { show('Could not load your recurring profile.', 'err'); }
  }
  async function saveProfile() {
    profileSaving = true; profileError = '';
    try {
      const res = await fetch('/api/me/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subjects: profileSubjects, research: profileResearch, duties: profileDuties, outreach: profileOutreach }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { profileError = d.error ?? 'Could not save profile.'; return; }
      showProfileModal = false;
      show('Recurring profile saved.');
    } catch { profileError = 'Could not save profile.'; }
    finally { profileSaving = false; }
  }
  function addProfileRow(kind: 'subjects' | 'research' | 'duties' | 'outreach') {
    const rows: Record<string, any[]> = { subjects: profileSubjects, research: profileResearch, duties: profileDuties, outreach: profileOutreach };
    const defaults: Record<string, any> = {
      subjects: { courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0 },
      research: { category: 'Journal Paper', title: '', venueOrAgency: '', role: '' },
      duties: { name: '', role: '', activity: '' },
      outreach: { activity: '', audience: '' },
    };
    rows[kind] = [...rows[kind], defaults[kind]];
    if (kind === 'subjects') profileSubjects = rows[kind];
    if (kind === 'research') profileResearch = rows[kind];
    if (kind === 'duties') profileDuties = rows[kind];
    if (kind === 'outreach') profileOutreach = rows[kind];
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
              {#if user?.role === 'FACULTY'}
                <button class="profile-item" onclick={openProfileModal} role="menuitem"><Repeat2 size={15} /><span>Recurring report template</span></button>
              {/if}
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
  {#if showProfileModal}
    <div class="pw-overlay" role="presentation" onclick={() => (showProfileModal = false)} onkeydown={(e) => { if (e.key === 'Escape') showProfileModal = false; }}>
      <div class="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <div class="profile-heading"><div><h3 id="profile-title">Recurring report template</h3><p class="pw-sub">Save the details that repeat each week. They will be pre-filled when you start a new report.</p></div></div>
        <div class="profile-tip"><span>Only add information that stays the same. You can edit the weekly details in each report.</span></div>
        <div class="profile-section"><div class="profile-section-title"><div><strong>Teaching subjects</strong><small>Courses and classes you regularly teach</small></div></div>
          {#if profileSubjects.length}<div class="profile-labels subject-labels"><span>Code</span><span>Course name</span><span>Program / year</span><span>Class type</span><span>Classes / week</span><span></span></div>{/if}
          {#each profileSubjects as item, i}<div class="profile-row subject-row"><input aria-label="Course code" placeholder="e.g. CS101" bind:value={item.courseCode} /><input aria-label="Course name" placeholder="Course name" bind:value={item.courseName} /><input aria-label="Program" placeholder="e.g. BCA 2" bind:value={item.programLevel} /><select aria-label="Class type" bind:value={item.classType}><option>Lecture</option><option>Lab</option><option>Tutorial</option><option>Seminar</option></select><input aria-label="Scheduled classes" type="number" min="0" placeholder="0" bind:value={item.scheduled} /><button class="row-remove" aria-label="Remove subject" title="Remove subject" onclick={() => (profileSubjects = profileSubjects.filter((_, n) => n !== i))}>Remove</button></div>{/each}
          <button class="profile-add" onclick={() => addProfileRow('subjects')}>Add subject</button>
        </div>
        <div class="profile-section"><div class="profile-section-title"><div><strong>Research and publications</strong><small>Ongoing work, papers, or research activities</small></div></div>
          {#if profileResearch.length}<div class="profile-labels two-labels"><span>Title or topic</span><span>Venue / agency</span><span></span></div>{/if}
          {#each profileResearch as item, i}<div class="profile-row two-row"><input aria-label="Research title" placeholder="Title or topic" bind:value={item.title} /><input aria-label="Venue" placeholder="Venue or agency" bind:value={item.venueOrAgency} /><button class="row-remove" aria-label="Remove research item" title="Remove research item" onclick={() => (profileResearch = profileResearch.filter((_, n) => n !== i))}>Remove</button></div>{/each}
          <button class="profile-add" onclick={() => addProfileRow('research')}>Add research item</button>
        </div>
        <div class="profile-section"><div class="profile-section-title"><div><strong>Institutional duties</strong><small>Committees, coordination, and recurring responsibilities</small></div></div>
          {#if profileDuties.length}<div class="profile-labels two-labels"><span>Duty or committee</span><span>Your role</span><span></span></div>{/if}
          {#each profileDuties as item, i}<div class="profile-row two-row"><input aria-label="Duty" placeholder="Duty or committee" bind:value={item.name} /><input aria-label="Duty role" placeholder="Your role" bind:value={item.role} /><button class="row-remove" aria-label="Remove duty" title="Remove duty" onclick={() => (profileDuties = profileDuties.filter((_, n) => n !== i))}>Remove</button></div>{/each}
          <button class="profile-add" onclick={() => addProfileRow('duties')}>Add duty</button>
        </div>
        <div class="profile-section"><div class="profile-section-title"><div><strong>Community outreach</strong><small>Regular events and activities outside the classroom</small></div></div>
          {#if profileOutreach.length}<div class="profile-labels two-labels"><span>Activity</span><span>Audience</span><span></span></div>{/if}
          {#each profileOutreach as item, i}<div class="profile-row two-row"><input aria-label="Outreach activity" placeholder="Activity" bind:value={item.activity} /><input aria-label="Outreach audience" placeholder="Audience" bind:value={item.audience} /><button class="row-remove" aria-label="Remove outreach activity" title="Remove activity" onclick={() => (profileOutreach = profileOutreach.filter((_, n) => n !== i))}>Remove</button></div>{/each}
          <button class="profile-add" onclick={() => addProfileRow('outreach')}>Add outreach activity</button>
        </div>
        {#if profileError}<p class="pw-error" role="alert">{profileError}</p>{/if}
        <div class="pw-actions"><button class="pw-cancel" onclick={() => (showProfileModal = false)}>Cancel</button><button class="pw-submit" disabled={profileSaving} onclick={saveProfile}>{profileSaving ? 'Saving…' : 'Save profile'}</button></div>
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
  .profile-dialog { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 26px 30px 22px; max-width: 820px; width: 92%; max-height: 88vh; overflow-y: auto; box-shadow: 0 18px 50px rgba(0,0,0,0.16); }
  .profile-heading { padding-bottom: 17px; border-bottom: 1px solid var(--line); }
  .profile-dialog h3 { margin: 0 0 4px; font-size: 1.08rem; color: var(--ink-2); }
  .profile-tip { margin: 15px 0 0; padding: 11px 0 14px; border-bottom: 1px solid var(--line-2); color: var(--muted); font-size: 0.72rem; }
  .profile-section { border-bottom: 1px solid var(--line-2); padding: 19px 0 20px; margin-top: 0; }
  .profile-section-title { margin-bottom: 11px; }
  .profile-section-title strong { display: block; color: var(--ink-2); font-size: 0.78rem; margin-bottom: 2px; }
  .profile-section-title small { display: block; color: var(--muted-3); font-size: 0.68rem; }
  .profile-labels { display: grid; gap: 7px; color: var(--muted-3); font-size: 0.62rem; font-weight: 700; margin: 0 0 5px; }
  .subject-labels { grid-template-columns: 0.8fr 1.4fr 1fr 0.8fr 0.75fr 58px; }
  .two-labels { grid-template-columns: 1fr 1fr 58px; }
  .profile-row { display: grid; grid-template-columns: 1fr 1.5fr 1fr auto; gap: 7px; margin-bottom: 7px; }
  .profile-row.subject-row { grid-template-columns: 0.8fr 1.4fr 1fr 0.8fr 0.75fr auto; }
  .profile-row.two-row { grid-template-columns: 1fr 1fr 58px; }
  .profile-row input, .profile-row select { min-width: 0; padding: 8px 9px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg-input); color: var(--ink-2); font: inherit; font-size: 0.76rem; }
  .profile-row input:focus, .profile-row select:focus { outline: 2px solid color-mix(in srgb, var(--blue) 18%, transparent); border-color: var(--blue); }
  .row-remove { border: 0; background: transparent; color: var(--muted-2); cursor: pointer; padding: 5px 2px; font: inherit; font-size: 0.66rem; font-weight: 700; }
  .row-remove:hover { color: var(--red); }
  .profile-add { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--blue); font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; padding: 5px 0; }
  @media (max-width: 720px) { .profile-dialog { padding: 21px 18px 18px; } .profile-labels { display: none; } .profile-row, .profile-row.subject-row, .profile-row.two-row { grid-template-columns: 1fr 1fr 58px; } .profile-row.subject-row input:first-child, .profile-row.subject-row input:nth-child(2) { grid-column: span 1; } }
  @media (max-width: 520px) { .profile-row.subject-row, .profile-row.two-row { grid-template-columns: 1fr 1fr 52px; } .profile-row.subject-row input:first-child { grid-column: span 2; } }
</style>
