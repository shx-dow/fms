<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  let { data } = $props();
  type User = { id: string; name: string; email: string; employee_code?: string | null; specialization?: string | null; role: string; is_active: number };
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
        <thead><tr><th>Name</th><th>Login</th><th>Employee code</th><th>Specialization</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {#if !filtered.length}
            <tr><td colspan="7" class="empty-row">{search ? 'No users match your search.' : 'No users found.'}</td></tr>
          {:else}
            {#each filtered as user}
              <tr>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>{user.employee_code ?? '—'}</td>
                <td>{user.specialization ?? '—'}</td>
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
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px 24px; box-shadow: var(--shadow-sm); }
  .dash-header h1 { font-size: 1.55rem; letter-spacing: -0.03em; margin: 0 0 4px; font-weight: 750; color: var(--text-1); }
  .dash-period { font-size: 0.84rem; color: var(--text-3); }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 8px; background: var(--navy); color: var(--paper); text-decoration: none; font-size: 0.8rem; font-weight: 750; white-space: nowrap; border: 0; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.14s ease; }
  .dash-cta:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .search-bar { margin-bottom: 16px; }
  .search-bar input { width: 100%; max-width: 400px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 8px; font: inherit; font-size: 0.84rem; background: var(--panel); color: var(--text-1); box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .search-bar input:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .search-bar input::placeholder { color: var(--muted-3); }
  .table-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: auto; box-shadow: var(--shadow-sm); }
  .table-card table { width: 100%; border-collapse: collapse; min-width: 720px; font-size: 0.82rem; }
  .table-card th, .table-card td { padding: 14px 18px; text-align: left; border-bottom: 1px solid var(--line-2); }
  .table-card th { text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); font-size: 0.64rem; font-weight: 800; background: rgba(248,250,252,0.7); white-space: nowrap; }
  .table-card tbody tr:hover td { background: #f6f9fc; }
  .table-card td { color: var(--text-2); }
  .table-card td strong { color: var(--text-1); font-weight: 700; }
  .pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 0.66rem; font-weight: 800; border: 1px solid transparent; }
  .pill.active { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .pill.inactive { background: var(--line-light); border-color: var(--line); color: var(--muted); }
  .td-acts { text-align: right; white-space: nowrap; }
  .btn-ghost { border: 1px solid transparent; border-radius: 6px; background: transparent; font: inherit; font-size: 0.74rem; font-weight: 700; cursor: pointer; margin-left: 6px; padding: 6px 10px; color: var(--accent); transition: all 0.12s; }
  .btn-ghost:hover { background: #eff4fb; border-color: var(--blue-border); }
  .confirm-group { display: inline-flex; gap: 6px; align-items: center; }
  .btn-confirm { border: 1px solid var(--navy); border-radius: 6px; padding: 6px 11px; font: inherit; font-size: 0.7rem; font-weight: 800; cursor: pointer; background: var(--navy); color: var(--paper); }
  .btn-confirm:hover { background: var(--blue-hover); }
  .btn-cancel { border: 1px solid var(--line); border-radius: 6px; padding: 6px 11px; font: inherit; font-size: 0.7rem; font-weight: 800; cursor: pointer; background: var(--panel); color: var(--muted); }
  .btn-cancel:hover { background: var(--bg-hover); }
  .empty-row { text-align: center; padding: 28px; color: var(--muted-2); font-size: 0.82rem; }
  .overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(2px); display: grid; place-items: center; z-index: 100; }
  .modal { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 30px; max-width: 460px; width: 90%; box-shadow: var(--shadow-lg); max-height: 90vh; overflow-y: auto; }
  .modal h3 { margin: 0 0 18px; font-size: 1.15rem; font-weight: 750; letter-spacing: -0.01em; color: var(--text-1); }
  .modal-fields { display: grid; gap: 14px; }
  .modal-fields label { display: grid; gap: 6px; font-size: 0.76rem; font-weight: 700; color: var(--text-3); }
  .modal-fields input, .modal-fields select { border: 1px solid var(--line); border-radius: 7px; padding: 10px 12px; font: inherit; font-size: 0.86rem; background: var(--bg-input); color: var(--text-1); box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .modal-fields input:focus, .modal-fields select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .modal-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .modal-acts .btn-ghost { border: 0; background: transparent; font: inherit; font-size: 0.8rem; color: var(--muted); cursor: pointer; padding: 8px 12px; }
  @media (max-width: 800px) { .dash-header { flex-direction: column; align-items: start; } }
</style>
