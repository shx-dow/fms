<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  type Department = { id: string; code: string; name: string; member_count: number };
  let departments: Department[] = $state([]);
  let code = $state('');
  let name = $state('');
  let loading = $state(true);
  let loadErr = $state('');
  onMount(async () => {
    try {
      const res = await fetch('/api/departments');
      const d = await res.json();
      departments = d.departments ?? [];
      loadErr = d.error ?? '';
    } catch { loadErr = 'Unable to load departments.'; }
    finally { loading = false; }
  });
  async function save() {
    const res = await fetch('/api/departments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: code.toLowerCase(), code, name }) });
    const d = await res.json();
    if (res.ok) {
      show('Department saved.');
      code = ''; name = '';
      departments = (await (await fetch('/api/departments')).json()).departments ?? [];
    } else show(d.error ?? 'Unable to save department.', 'err');
  }
</script>

<svelte:head><title>Departments · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <header class="dash-header">
    <div>
      <h1>Departments</h1>
      <span class="dash-period">{departments.length} department{departments.length === 1 ? '' : 's'}</span>
    </div>
  </header>
  {#if loadErr}<div class="msg err">{loadErr}</div>{/if}
  {#if loading}
    <div class="dash-loading"><span class="spinner"></span><span>Loading…</span></div>
  {:else}
    <div class="dept-layout">
      <section class="dept-card">
        <div class="panel-head"><h2>Department directory</h2></div>
        {#if !departments.length}
          <div class="empty-state">No departments configured.</div>
        {:else}
          {#each departments as d}
            <div class="dept-row">
              <div><strong class="dept-code">{d.code}</strong><span class="dept-name">{d.name}</span></div>
              <span class="dept-count">{d.member_count} member{d.member_count === 1 ? '' : 's'}</span>
            </div>
          {/each}
        {/if}
      </section>
      <form class="dept-card" onsubmit={(e) => { e.preventDefault(); save(); }}>
        <div class="panel-head"><h2>Add department</h2></div>
        <div class="dept-form">
          <label>Code<input bind:value={code} required placeholder="CSE" /></label>
          <label>Name<input bind:value={name} required placeholder="Computer Science and Engineering" /></label>
          <button class="dash-cta" type="submit">Save department</button>
        </div>
      </form>
    </div>
  {/if}
</main>

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: #71818a; font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dbe3e7; border-top-color: #145b78; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: #667477; }
  .msg.err { padding: 11px 14px; border-radius: 6px; margin-bottom: 18px; font-size: 0.78rem; background: #f9e9e7; color: #8f413b; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: #17252d; color: #f4f6f5; text-decoration: none; font-size: 0.78rem; font-weight: 700; white-space: nowrap; border: 0; cursor: pointer; transition: background 0.14s ease; }
  .dash-cta:hover { background: #294a5a; }
  .dept-layout { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; }
  .dept-card { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #dbe3e7; }
  .panel-head h2 { font-size: 0.9rem; margin: 0; letter-spacing: -0.01em; }
  .dept-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #e8eeec; }
  .dept-row:last-child { border-bottom: 0; }
  .dept-code { display: block; font-size: 0.8rem; color: #145b78; }
  .dept-name { display: block; color: #1b2b36; font-size: 0.78rem; margin-top: 3px; }
  .dept-count { flex: none; color: #87969c; font-size: 0.7rem; }
  .empty-state { padding: 24px 20px; color: #87969c; font-size: 0.8rem; }
  .dept-form { display: grid; gap: 14px; padding: 18px 20px; }
  .dept-form label { font-size: 0.74rem; font-weight: 700; color: #667477; }
  .dept-form input { width: 100%; display: block; margin-top: 5px; padding: 9px 10px; border: 1px solid #dbe3e7; border-radius: 5px; font: inherit; background: #fbfcfc; color: #1b2b36; box-sizing: border-box; }
  @media (max-width: 700px) { .dept-layout { grid-template-columns: 1fr; } }
</style>