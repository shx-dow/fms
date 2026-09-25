<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
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
  <PageHeader title="Faculty directory" sub="{users.length} account{users.length === 1 ? '' : 's'}">
    {#snippet actions()}
      <NotificationBell /><button class="btn btn-primary" onclick={openCreate}>+ Add user</button>
    {/snippet}
  </PageHeader>
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
    <Modal title={editUser ? 'Edit user' : 'Add user'} onclose={() => (showForm = false)}>
      <div class="modal-fields">
        <label>Full name<input bind:value={formName} placeholder="e.g. Jane Smith" /></label>
        <label>Email<input bind:value={formEmail} type="email" placeholder="jane@example.edu" /></label>
        <label>Role<select bind:value={formRole}><option value="FACULTY">Faculty</option><option value="HOD">HOD</option><option value="ADMIN">Admin</option></select></label>
        <label>Password{editUser ? ' (leave blank to keep current)' : ''}<input bind:value={formPass} type="password" placeholder="Password" /></label>
      </div>
      <div class="modal-acts"><button class="btn" onclick={() => (showForm = false)}>Cancel</button><button class="btn btn-primary" onclick={saveUser}>{editUser ? 'Save changes' : 'Create user'}</button></div>
    </Modal>
  {/if}
</main>

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: var(--muted-3); font-size: 0.88rem; }
  .search-bar { margin-bottom: 16px; }
  .search-bar input { width: 100%; max-width: 400px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 8px; font: inherit; font-size: 0.84rem; background: var(--panel); color: var(--text-1); box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .search-bar input:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .search-bar input::placeholder { color: var(--muted-3); }
  .pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 0.66rem; font-weight: 800; border: 1px solid transparent; }
  .pill.active { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .pill.inactive { background: var(--line-light); border-color: var(--line); color: var(--muted); }
  .td-acts { text-align: right; white-space: nowrap; }
  .confirm-group { display: inline-flex; gap: 6px; align-items: center; }
  .btn-confirm { border: 1px solid var(--navy); border-radius: 6px; padding: 6px 11px; font: inherit; font-size: 0.7rem; font-weight: 800; cursor: pointer; background: var(--navy); color: var(--paper); }
  .btn-confirm:hover { background: var(--blue-hover); }
  .btn-cancel { border: 1px solid var(--line); border-radius: 6px; padding: 6px 11px; font: inherit; font-size: 0.7rem; font-weight: 800; cursor: pointer; background: var(--panel); color: var(--muted); }
  .btn-cancel:hover { background: var(--bg-hover); }
  .empty-row { text-align: center; padding: 28px; color: var(--muted-2); font-size: 0.82rem; }
  .modal-fields { display: grid; gap: 14px; }
  .modal-fields label { display: grid; gap: 6px; font-size: 0.76rem; font-weight: 700; color: var(--text-3); }
  .modal-fields input, .modal-fields select { border: 1px solid var(--line); border-radius: 7px; padding: 10px 12px; font: inherit; font-size: 0.86rem; background: var(--bg-input); color: var(--text-1); box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .modal-fields input:focus, .modal-fields select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .modal-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
</style>
