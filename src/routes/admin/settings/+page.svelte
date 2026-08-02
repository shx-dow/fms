<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  type Period = { id: string; label: string; kind: string; starts_on: string; ends_on: string; due_on: string; is_open: number };
  let periods: Period[] = $state([]);
  let error = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let editStarts = $state('');
  let editEnds = $state('');
  let editDue = $state('');
  let showCreate = $state(false);
  let newStarts = $state('');
  let newEnds = $state('');
  let newDue = $state('');
  let newOpen = $state(true);
  const openPeriod = $derived(periods.find(p => p.is_open) ?? null);

  const toLocalInput = (iso: string) => {
    const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    return m ? `${m[1]}T${m[2]}:${m[3]}` : iso.slice(0, 16);
  };
  const fromLocalInput = (v: string) => (v ? `${v}:00+05:30` : '');

  onMount(load);
  async function load() {
    try {
      const res = await fetch('/api/periods');
      const d = await res.json();
      periods = d.periods ?? [];
      const op = (d.periods ?? []).find((p: any) => p.is_open);
      if (op) { editStarts = op.starts_on; editEnds = op.ends_on; editDue = toLocalInput(op.due_on); }
    } catch { error = 'Unable to load periods.'; }
    finally { loading = false; }
  }
  async function saveOpen() {
    if (!openPeriod) return;
    if (!editStarts || !editEnds || !editDue) { show('All dates are required.', 'err'); return; }
    saving = true;
    const res = await fetch('/api/periods', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: openPeriod.id, startsOn: editStarts, endsOn: editEnds, dueOn: fromLocalInput(editDue), isOpen: true }),
    });
    saving = false;
    if (!res.ok) { show('Unable to save period.', 'err'); return; }
    show('Period saved.');
    load();
  }
  async function toggleOpen(p: Period) {
    saving = true;
    const res = await fetch('/api/periods', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: p.id, startsOn: p.starts_on, endsOn: p.ends_on, dueOn: p.due_on, isOpen: !p.is_open }),
    });
    saving = false;
    if (!res.ok) { show('Unable to update period.', 'err'); return; }
    show(p.is_open ? 'Period closed.' : 'Period opened.');
    load();
  }
  async function createPeriod() {
    if (!newStarts || !newEnds || !newDue) { show('All dates are required.', 'err'); return; }
    saving = true;
    const res = await fetch('/api/periods', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: `week-${newStarts}`, startsOn: newStarts, endsOn: newEnds, dueOn: fromLocalInput(newDue), isOpen: newOpen }),
    });
    saving = false;
    if (!res.ok) { show('Unable to create period.', 'err'); return; }
    show('Period created.');
    showCreate = false; newStarts = ''; newEnds = ''; newDue = ''; newOpen = true;
    load();
  }
  async function deletePeriodConfirm(p: Period) {
    if (!confirm(`Delete ${p.label || p.id}? This cannot be undone.`)) return;
    saving = true;
    const res = await fetch(`/api/periods?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    saving = false;
    if (!res.ok) { show('Unable to delete period.', 'err'); return; }
    show('Period deleted.');
    load();
  }
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
</script>

<svelte:head><title>Reporting periods · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <header class="dash-header">
    <div>
      <h1>Reporting periods</h1>
      <span class="dash-period">Weekly schedule configuration</span>
    </div>
    <div class="dash-actions"><button class="dash-cta" onclick={() => (showCreate = true)}>+ New period</button></div>
  </header>
  {#if error}<div class="msg err">{error}</div>{/if}
  {#if loading}
    <div class="dash-loading"><span class="spinner"></span><span>Loading…</span></div>
  {:else}
    {#if openPeriod}
      <section class="settings-card">
        <div class="setting-head">
          <div>
            <h2>{openPeriod.label}</h2>
            <p class="setting-deadline">Deadline {fmtDateTime(openPeriod.due_on)}.</p>
          </div>
          <span class="status-pill open">Open</span>
        </div>
        <div class="setting-form">
          <label>Period starts<input type="date" bind:value={editStarts} /></label>
          <label>Period ends<input type="date" bind:value={editEnds} /></label>
          <label>Submission deadline<input type="datetime-local" bind:value={editDue} /></label>
        </div>
        <div class="setting-acts">
          <button class="btn-close" onclick={() => toggleOpen(openPeriod)} disabled={saving}>Close period</button>
          <button class="dash-cta" onclick={saveOpen} disabled={saving}>Save changes</button>
        </div>
      </section>
    {/if}

    <section class="table-card">
      <div class="panel-head"><h2>All periods</h2></div>
      {#if !periods.length}
        <div class="empty-state">No reporting periods configured yet.</div>
      {:else}
        <table>
          <thead><tr><th>Period</th><th>Starts</th><th>Ends</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {#each periods as p}
              <tr>
                <td><strong>{p.label}</strong></td>
                <td>{fmtDate(p.starts_on)}</td>
                <td>{fmtDate(p.ends_on)}</td>
                <td>{fmtDateTime(p.due_on)}</td>
                <td><span class="status-pill" class:open={p.is_open} class:closed={!p.is_open}>{p.is_open ? 'Open' : 'Closed'}</span></td>
                <td class="td-acts">
                  <button class="btn-ghost" onclick={() => toggleOpen(p)} disabled={saving}>{p.is_open ? 'Close' : 'Open'}</button>
                  <button class="btn-ghost btn-del" onclick={() => deletePeriodConfirm(p)} disabled={saving}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  {/if}

  {#if showCreate}
    <div class="overlay" role="presentation" onclick={() => (showCreate = false)} onkeydown={(e) => { if (e.key === 'Escape') showCreate = false; }}>
      <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h3>Create reporting period</h3>
        <div class="modal-fields">
          <label>Period starts<input type="date" bind:value={newStarts} /></label>
          <label>Period ends<input type="date" bind:value={newEnds} /></label>
          <label>Submission deadline<input type="datetime-local" bind:value={newDue} /></label>
          <label class="check-row"><input type="checkbox" bind:checked={newOpen} /> Open for submissions</label>
        </div>
        <div class="modal-acts">
          <button class="btn-ghost" onclick={() => (showCreate = false)}>Cancel</button>
          <button class="dash-cta" onclick={createPeriod} disabled={saving}>Create period</button>
        </div>
      </div>
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
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: #17252d; color: #f4f6f5; text-decoration: none; font-size: 0.78rem; font-weight: 700; white-space: nowrap; border: 0; cursor: pointer; transition: background 0.14s ease; }
  .dash-cta:hover { background: #294a5a; }
  .dash-cta:disabled { opacity: 0.55; cursor: not-allowed; }
  .msg.err { padding: 11px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.78rem; background: #f9e9e7; color: #8f413b; }
  .settings-card { max-width: 720px; background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
  .setting-head { display: flex; justify-content: space-between; gap: 20px; padding: 20px; border-bottom: 1px solid #dbe3e7; }
  .settings-card h2 { margin: 0; font-size: 1.1rem; }
  .setting-deadline { color: #667477; margin: 5px 0 0; font-size: 0.78rem; }
  .status-pill { flex: none; font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; align-self: start; }
  .status-pill.open { background: #7fbf97; color: #1a5a3a; }
  .status-pill.closed { background: #eef3f5; color: #71818a; }
  .setting-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 20px; }
  .setting-form label { font-size: 0.74rem; font-weight: 700; color: #667477; }
  .setting-form input { display: block; width: 100%; margin-top: 5px; padding: 9px 10px; border: 1px solid #dbe3e7; border-radius: 5px; font: inherit; background: #fbfcfc; color: #1b2b36; box-sizing: border-box; }
  .setting-acts { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px; }
  .btn-close { border: 1px solid #e8d4d4; border-radius: 6px; padding: 8px 14px; background: #fdfcf9; color: #a84f42; font: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.12s; }
  .btn-close:hover { background: #fdf0ef; }
  .btn-close:disabled { opacity: 0.55; cursor: not-allowed; }
  .table-card { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: auto; }
  .panel-head { padding: 16px 20px; border-bottom: 1px solid #dbe3e7; }
  .panel-head h2 { font-size: 0.9rem; margin: 0; letter-spacing: -0.01em; }
  .table-card table { width: 100%; border-collapse: collapse; min-width: 720px; font-size: 0.78rem; }
  .table-card th, .table-card td { padding: 13px 16px; text-align: left; border-bottom: 1px solid #e8eeec; }
  .table-card th { text-transform: uppercase; letter-spacing: 0.08em; color: #87969c; font-size: 0.62rem; font-weight: 800; }
  .table-card td { color: #667477; }
  .table-card td strong { color: #1b2b36; }
  .td-acts { text-align: right; white-space: nowrap; }
  .btn-ghost { border: 0; background: transparent; font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; margin-left: 6px; color: #145b78; }
  .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-del { color: #a84f42; }
  .empty-state { padding: 24px; color: #87969c; font-size: 0.82rem; }
  .overlay { position: fixed; inset: 0; background: rgba(23, 37, 45, 0.35); display: grid; place-items: center; z-index: 100; }
  .modal { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 10px; padding: 28px; max-width: 440px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
  .modal h3 { margin: 0 0 18px; font-size: 1.1rem; color: #1b2b36; }
  .modal-fields { display: grid; gap: 14px; }
  .modal-fields label { display: grid; gap: 5px; font-size: 0.74rem; font-weight: 700; color: #667477; }
  .modal-fields input[type="date"], .modal-fields input[type="datetime-local"] { border: 1px solid #dbe3e7; border-radius: 5px; padding: 9px 10px; font: inherit; background: #fbfcfc; color: #1b2b36; }
  .check-row { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: #1b2b36; }
  .check-row input { width: 16px; height: 16px; }
  .modal-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .modal-acts .btn-ghost { border: 0; background: transparent; font: inherit; font-size: 0.8rem; color: #667477; cursor: pointer; padding: 8px 12px; }
  @media (max-width: 700px) {
    .dash-header { flex-direction: column; align-items: start; }
    .setting-form { grid-template-columns: 1fr; }
  }
</style>
