<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  let { data } = $props();
  type User = { id: string; name: string; email: string; role: string; is_active: number };
  let users: User[] = $state([]);
  let search = $state('');
  let loading = $state(true);
  let confirmId = $state<string | null>(null);
  let showForm = $state(false);
  let editUser: User | null = $state(null);
  let formName = $state(''); let formEmail = $state(''); let formRole = $state('FACULTY'); let formPass = $state('');
  onMount(async () => {
    try {
      const res = await fetch('/api/users');
      users = (await res.json()).users ?? [];
    } catch { show('Unable to load data.', 'err'); }
    finally { loading = false; }
  });
  let filtered = $derived(users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())));
  async function toggle(user: User) {
    confirmId = null;
    const res = await fetch('/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: user.id, isActive: !user.is_active }) });
    if (res.ok) user.is_active = user.is_active ? 0 : 1; else show('Unable to update user status.', 'err');
  }
  function openCreate() { editUser = null; formName = ''; formEmail = ''; formRole = 'FACULTY'; formPass = ''; showForm = true; }
  function openEdit(u: User) { editUser = u; formName = u.name; formEmail = u.email; formRole = u.role; formPass = ''; showForm = true; }
  async function saveUser() {
    if (!formName || !formEmail) { show('Name and email are required.', 'err'); return; }
    if (!editUser && !formPass) { show('Password is required for new users.', 'err'); return; }
    const payload: any = editUser ? { action: 'UPDATE', userId: editUser.id, name: formName, email: formEmail, role: formRole } : { action: 'CREATE', name: formName, email: formEmail, role: formRole, password: formPass };
    if (editUser && formPass) payload.password = formPass;
    const res = await fetch('/api/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json();
    if (!res.ok) { show(d.error ?? 'Save failed.', 'err'); return; }
    show('User saved.');
    showForm = false; editUser = null;
    users = (await (await fetch('/api/users')).json()).users ?? [];
  }
</script>

<svelte:head><title>Faculty directory · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <header class="dash-header">
    <div>
      <h1>Faculty directory</h1>
      <span class="dash-period">{users.length} account{users.length === 1 ? '' : 's'}</span>
    </div>
    <div class="dash-actions"><NotificationBell /><button class="dash-cta" onclick={openCreate}>+ Add user</button></div>
  </header>
  {#if loading}
    <div class="dash-loading"><span class="spinner"></span><span>Loading…</span></div>
  {:else}
    <div class="search-bar"><input type="search" placeholder="Search by name or email…" bind:value={search} /></div>
    <section class="table-card">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {#if !filtered.length}
            <tr><td colspan="5" class="empty-row">{search ? 'No users match your search.' : 'No users found.'}</td></tr>
          {:else}
            {#each filtered as user}
              <tr>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td><span class="pill" class:active={user.is_active} class:inactive={!user.is_active}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td class="td-acts">
                  {#if confirmId === user.id}
                    <span class="confirm-group"><button class="btn-confirm" onclick={() => toggle(user)}>Confirm</button><button class="btn-cancel" onclick={() => (confirmId = null)}>Cancel</button></span>
                  {:else}
                    <button class="btn-ghost" onclick={() => (confirmId = user.id)}>{user.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button class="btn-ghost" onclick={() => openEdit(user)}>Edit</button>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </section>
  {/if}
  {#if showForm}
    <div class="overlay" role="presentation" onclick={() => (showForm = false)} onkeydown={(e) => { if (e.key === 'Escape') showForm = false; }}>
      <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h3>{editUser ? 'Edit user' : 'Add user'}</h3>
        <div class="modal-fields">
          <label>Full name<input bind:value={formName} placeholder="e.g. Jane Smith" /></label>
          <label>Email<input bind:value={formEmail} type="email" placeholder="jane@example.edu" /></label>
          <label>Role<select bind:value={formRole}><option value="FACULTY">Faculty</option><option value="HOD">HOD</option><option value="ADMIN">Admin</option></select></label>
          <label>Password{editUser ? ' (leave blank to keep current)' : ''}<input bind:value={formPass} type="password" placeholder="Password" /></label>
        </div>
        <div class="modal-acts"><button class="btn-ghost" onclick={() => (showForm = false)}>Cancel</button><button class="dash-cta" onclick={saveUser}>{editUser ? 'Save changes' : 'Create user'}</button></div>
      </div>
    </div>
  {/if}
</main>

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: var(--muted-3); font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: var(--muted); }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: var(--navy); color: var(--paper); text-decoration: none; font-size: 0.78rem; font-weight: 700; white-space: nowrap; border: 0; cursor: pointer; transition: background 0.14s ease; }
  .dash-cta:hover { background: var(--blue-hover); }
  .search-bar { margin-bottom: 16px; }
  .search-bar input { width: 100%; max-width: 380px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; font: inherit; background: var(--panel); color: var(--ink-2); }
  .table-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: auto; }
  .table-card table { width: 100%; border-collapse: collapse; min-width: 720px; font-size: 0.78rem; }
  .table-card th, .table-card td { padding: 13px 16px; text-align: left; border-bottom: 1px solid var(--line-2); }
  .table-card th { text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-2); font-size: 0.62rem; font-weight: 800; }
  .table-card td { color: var(--muted); }
  .table-card td strong { color: var(--ink-2); }
  .pill { display: inline-block; padding: 3px 7px; border-radius: 3px; font-size: 0.65rem; font-weight: 800; }
  .pill.active { background: var(--green-soft); color: var(--green); }
  .pill.inactive { background: var(--bg-hover); color: var(--muted-3); }
  .td-acts { text-align: right; white-space: nowrap; }
  .btn-ghost { border: 0; background: transparent; font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; margin-left: 6px; color: var(--blue); }
  .confirm-group { display: inline-flex; gap: 6px; }
  .btn-confirm { border: 0; border-radius: 4px; padding: 5px 9px; font: inherit; font-size: 0.68rem; font-weight: 800; cursor: pointer; background: var(--red); color: var(--panel); }
  .btn-cancel { border: 0; border-radius: 4px; padding: 5px 9px; font: inherit; font-size: 0.68rem; font-weight: 800; cursor: pointer; background: var(--bg-hover); color: var(--muted); }
  .empty-row { text-align: center; padding: 24px; color: var(--muted-2); font-size: 0.8rem; }
  .overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); display: grid; place-items: center; z-index: 100; }
  .modal { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 28px; max-width: 440px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.12); max-height: 90vh; overflow-y: auto; }
  .modal h3 { margin: 0 0 18px; font-size: 1.1rem; color: var(--ink-2); }
  .modal-fields { display: grid; gap: 14px; }
  .modal-fields label { display: grid; gap: 5px; font-size: 0.74rem; font-weight: 700; color: var(--muted); }
  .modal-fields input, .modal-fields select { border: 1px solid var(--line); border-radius: 5px; padding: 9px 10px; font: inherit; background: var(--bg-input); color: var(--ink-2); }
  .modal-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .modal-acts .btn-ghost { border: 0; background: transparent; font: inherit; font-size: 0.8rem; color: var(--muted); cursor: pointer; padding: 8px 12px; }
  @media (max-width: 800px) { .dash-header { flex-direction: column; align-items: start; } }
</style>