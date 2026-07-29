<script lang="ts">
  import { onMount } from 'svelte';
  let { data } = $props();
  type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    department_name?: string;
    is_active: number;
    department_id?: string;
  };
  let users: User[] = $state([]);
  let departments: { id: string; name: string }[] = $state([]);
  let search = $state('');
  let error = $state('');
  let loading = $state(true);
  let confirmId = $state<string | null>(null);
  let showForm = $state(false);
  let editUser: User | null = $state(null);
  let formName = $state('');
  let formEmail = $state('');
  let formRole = $state('FACULTY');
  let formDept = $state('');
  let formPass = $state('');
  onMount(async () => {
    try {
      const [userRes, deptRes] = await Promise.all([fetch('/api/users'), fetch('/api/departments')]);
      const userData = await userRes.json();
      const deptData = await deptRes.json();
      users = userData.users ?? [];
      departments = deptData.departments ?? [];
    } catch {
      error = 'Unable to load data.';
    } finally {
      loading = false;
    }
  });
  let filtered = $derived(
    users.filter(
      (u) =>
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  async function toggle(user: User) {
    confirmId = null;
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isActive: !user.is_active }),
    });
    if (response.ok) {
      user.is_active = user.is_active ? 0 : 1;
    } else {
      error = 'Unable to update user status.';
    }
  }
  function openCreate() {
    editUser = null;
    formName = '';
    formEmail = '';
    formRole = 'FACULTY';
    formDept = '';
    formPass = '';
    showForm = true;
  }
  function openEdit(u: User) {
    editUser = u;
    formName = u.name;
    formEmail = u.email;
    formRole = u.role;
    formDept = u.department_id ?? '';
    formPass = '';
    showForm = true;
  }
  async function saveUser() {
    error = '';
    if (!formName || !formEmail) {
      error = 'Name and email are required.';
      return;
    }
    if (!editUser && !formPass) {
      error = 'Password is required for new users.';
      return;
    }
    const payload: any = editUser
      ? {
          action: 'UPDATE',
          userId: editUser.id,
          name: formName,
          email: formEmail,
          role: formRole,
          departmentId: formDept || null,
        }
      : {
          action: 'CREATE',
          name: formName,
          email: formEmail,
          role: formRole,
          password: formPass,
          departmentId: formDept || null,
        };
    if (editUser && formPass) payload.password = formPass;
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await response.json();
    if (!response.ok) {
      error = d.error ?? 'Save failed.';
      return;
    }
    showForm = false;
    editUser = null;
    const res = await fetch('/api/users');
    const data = await res.json();
    users = data.users ?? [];
  }
</script>

<svelte:head><title>Faculty directory · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  <div class="breadcrumb">Administration <span>/</span> Faculty directory</div>
  <div class="page-heading">
    <div>
      <div class="eyebrow">Administration</div>
      <h1>Faculty directory</h1>
      <p>Manage reporting access and department assignments.</p>
    </div>
    <span class="period-chip">{users.length} account{users.length === 1 ? '' : 's'}</span>
  </div>
  {#if error}<div class="error">{error}</div>{/if}{#if loading}<div class="loading-panel">
      <span class="spinner"></span><span>Loading faculty directory…</span>
    </div>{:else}<div class="toolbar">
      <div class="search-bar"><input type="search" placeholder="Search by name or email…" bind:value={search} /></div>
      <button class="add-user-btn" onclick={openCreate}>+ Add user</button>
    </div>
    <section class="user-panel">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th></th></tr></thead
        ><tbody
          >{#if !filtered.length}<tr
              ><td colspan="6" class="empty-row">{search ? 'No users match your search.' : 'No users found.'}</td></tr
            >{:else}{#each filtered as user}<tr
                ><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.role}</td><td
                  >{user.department_name ?? 'Institution-wide'}</td
                ><td
                  ><span class="status-pill {user.is_active ? 'active' : 'inactive'}"
                    >{user.is_active ? 'Active' : 'Inactive'}</span
                  ></td
                ><td class="action"
                  >{#if confirmId === user.id}<span class="confirm-group"
                      ><button class="confirm-yes" onclick={() => toggle(user)}>Confirm</button><button
                        class="confirm-no"
                        onclick={() => (confirmId = null)}>Cancel</button
                      ></span
                    >{:else}<button class="toggle-btn" onclick={() => (confirmId = user.id)}
                      >{user.is_active ? 'Deactivate' : 'Activate'}</button
                    ><button class="edit-btn" onclick={() => openEdit(user)}>Edit</button>{/if}</td
                ></tr
              >{/each}{/if}</tbody
        >
      </table>
    </section>{/if}{#if showForm}<div class="overlay" onclick={() => (showForm = false)}>
      <div class="user-form" onclick={(e) => e.stopPropagation()}>
        <h3>{editUser ? 'Edit user' : 'Add user'}</h3>
        <div class="form-fields">
          <label>Full name<input bind:value={formName} placeholder="e.g. Jane Smith" /></label><label
            >Email<input bind:value={formEmail} type="email" placeholder="jane@example.edu" /></label
          ><label
            >Role<select bind:value={formRole}
              ><option value="FACULTY">Faculty</option><option value="HOD">HOD</option><option value="ADMIN"
                >Admin</option
              ></select
            ></label
          ><label
            >Department<select bind:value={formDept}
              ><option value="">Institution-wide</option>{#each departments as d}<option value={d.id}>{d.name}</option
                >{/each}</select
            ></label
          ><label
            >Password{editUser ? ' (leave blank to keep current)' : ''}<input
              bind:value={formPass}
              type="password"
              placeholder="Password"
            /></label
          >
        </div>
        {#if error}<div class="form-error">{error}</div>{/if}
        <div class="form-actions">
          <button class="quiet" onclick={() => (showForm = false)}>Cancel</button><button
            class="submit"
            onclick={saveUser}>{editUser ? 'Save changes' : 'Create user'} <span>→</span></button
          >
        </div>
      </div>
    </div>{/if}
</main>

<style>
  .breadcrumb {
    font-size: 0.73rem;
    color: #71818a;
    margin-bottom: 8px;
  }
  .breadcrumb span {
    padding: 0 8px;
    color: #b2bdc1;
  }
  .loading-panel {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px;
    color: #71818a;
    font-size: 0.88rem;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #dbe3e7;
    border-top-color: #087f73;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
  }
  .search-bar {
    flex: 1;
  }
  .search-bar input {
    width: 100%;
    max-width: 380px;
    padding: 10px 12px;
    border: 1px solid #c8d5da;
    border-radius: 6px;
    font: inherit;
    background: #fdfcf9;
  }
  .add-user-btn {
    border: 0;
    border-radius: 6px;
    padding: 10px 16px;
    background: #087f73;
    color: #fdfcf9;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 750;
    cursor: pointer;
    white-space: nowrap;
  }
  .user-panel {
    background: #fdfcf9;
    border: 1px solid #dbe3e7;
    border-radius: 7px;
    overflow: auto;
  }
  .user-panel table {
    width: 100%;
    border-collapse: collapse;
    min-width: 720px;
    font-size: 0.76rem;
  }
  .user-panel th,
  .user-panel td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #e6ecee;
  }
  .user-panel th {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #87969c;
    font-size: 0.63rem;
  }
  .user-panel td {
    color: #61727d;
  }
  .user-panel td strong {
    color: #1b2b36;
  }
  .status-pill {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 800;
  }
  .status-pill.active {
    background: #e4f3ef;
    color: #167166;
  }
  .status-pill.inactive {
    background: #f1f3f4;
    color: #71818a;
  }
  .action {
    text-align: right;
    white-space: nowrap;
  }
  .toggle-btn,
  .edit-btn {
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 0.74rem;
    font-weight: 800;
    cursor: pointer;
    margin-left: 6px;
  }
  .toggle-btn {
    color: #087f73;
  }
  .edit-btn {
    color: #61727d;
  }
  .confirm-group {
    display: inline-flex;
    gap: 6px;
  }
  .confirm-yes,
  .confirm-no {
    border: 0;
    border-radius: 4px;
    padding: 5px 9px;
    font: inherit;
    font-size: 0.7rem;
    font-weight: 800;
    cursor: pointer;
  }
  .confirm-yes {
    background: #a24e45;
    color: #fdfcf9;
  }
  .confirm-no {
    background: #e6ecee;
    color: #61727d;
  }
  .error {
    padding: 11px 14px;
    background: #f9e9e7;
    color: #8f413b;
    border-radius: 5px;
    margin-bottom: 18px;
    font-size: 0.78rem;
  }
  .empty-row {
    text-align: center;
    padding: 24px;
    color: #87969c;
    font-size: 0.8rem;
  }
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(27, 43, 54, 0.35);
    display: grid;
    place-items: center;
    z-index: 100;
  }
  .user-form {
    background: #fdfcf9;
    border: 1px solid #dbe3e7;
    border-radius: 10px;
    padding: 28px;
    max-width: 460px;
    width: 90%;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    max-height: 90vh;
    overflow-y: auto;
  }
  .user-form h3 {
    margin: 0 0 18px;
    font-size: 1.15rem;
    color: #1b2b36;
  }
  .form-fields {
    display: grid;
    gap: 14px;
  }
  .form-fields label {
    display: grid;
    gap: 5px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #61727d;
  }
  .form-fields input,
  .form-fields select {
    border: 1px solid #cbd7de;
    border-radius: 5px;
    padding: 9px 10px;
    font: inherit;
    background: #fbfcfc;
    color: #1b2b36;
  }
  .form-error {
    padding: 10px 14px;
    background: #f9e9e7;
    color: #8f413b;
    border-radius: 5px;
    margin-top: 14px;
    font-size: 0.78rem;
  }
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
  .form-actions .quiet {
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 0.8rem;
    color: #61727d;
    cursor: pointer;
  }
  .form-actions .submit {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border: 0;
    border-radius: 6px;
    background: #172a3a;
    color: #f5f4ef;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
  }
</style>
