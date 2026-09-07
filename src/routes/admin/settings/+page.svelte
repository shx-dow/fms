<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  type Period = { id: string; label: string; kind: string; starts_on: string; ends_on: string; due_on: string; is_open: number };
  let periods: Period[] = $state([]);
  let error = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let editStarts = $state('');
  let editEnds = $state('');
  let editDue = $state('');
  let showCreate = $state(false);
  let deleteTarget: Period | null = $state(null);
  let deleting = $state(false);
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
  async function deletePeriodConfirm() {
    if (!deleteTarget || deleting) return;
    deleting = true;
    const res = await fetch(`/api/periods?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
    deleting = false;
    if (!res.ok) { show('Unable to delete period.', 'err'); return; }
    show('Period deleted.');
    deleteTarget = null;
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
    <div class="dash-actions"><NotificationBell /><button class="dash-cta" onclick={() => (showCreate = true)}>+ New period</button></div>
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
                  <button class="btn-ghost btn-del" onclick={() => (deleteTarget = p)} disabled={saving}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  {/if}

  {#if deleteTarget}
    <div class="overlay" role="presentation" onclick={() => (deleteTarget = null)} onkeydown={(e) => { if (e.key === 'Escape') deleteTarget = null; }}>
      <div class="modal modal-narrow" role="dialog" aria-modal="true" aria-labelledby="del-title" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h3 id="del-title">Delete {deleteTarget.label || deleteTarget.id}?</h3>
        <p class="modal-note">Only periods without reports can be deleted. This cannot be undone.</p>
        <div class="modal-acts">
          <button class="btn-ghost" onclick={() => (deleteTarget = null)}>Cancel</button>
          <button class="btn-del-solid" onclick={deletePeriodConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete period'}</button>
        </div>
      </div>
    </div>
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
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: var(--muted-3); font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px 24px; box-shadow: var(--shadow-sm); }
  .dash-header h1 { font-size: 1.55rem; letter-spacing: -0.03em; margin: 0 0 4px; font-weight: 750; color: var(--text-1); }
  .dash-period { font-size: 0.84rem; color: var(--text-3); }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 8px; background: var(--navy); color: var(--paper); text-decoration: none; font-size: 0.8rem; font-weight: 750; white-space: nowrap; border: 0; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.14s ease; }
  .dash-cta:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .dash-cta:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .msg.err { padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 0.8rem; background: var(--red-bg-alt); border: 1px solid var(--red-border); color: var(--red-dark); box-shadow: var(--shadow-xs); }
  .settings-card { max-width: 760px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm); border-top: 3px solid var(--success-border); }
  .setting-head { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px; border-bottom: 1px solid var(--line); background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent); }
  .settings-card h2 { margin: 0; font-size: 1.15rem; font-weight: 750; letter-spacing: -0.01em; color: var(--text-1); }
  .setting-deadline { color: var(--text-3); margin: 6px 0 0; font-size: 0.8rem; }
  .status-pill { flex: none; font-size: 0.66rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; align-self: start; border: 1px solid transparent; }
  .status-pill.open { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .status-pill.closed { background: var(--line-light); border-color: var(--line); color: var(--muted); }
  .setting-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 22px 24px; }
  .setting-form label { font-size: 0.76rem; font-weight: 700; color: var(--text-3); }
  .setting-form input { display: block; width: 100%; margin-top: 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; font: inherit; font-size: 0.86rem; background: var(--bg-input); color: var(--text-1); box-sizing: border-box; box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .setting-form input:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .setting-acts { display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 22px; }
  .btn-close { border: 1px solid var(--red-border); border-radius: 6px; padding: 8px 14px; background: var(--panel); color: var(--red); font: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.12s; }
  .btn-close:hover { background: var(--red-bg-alt); }
  .btn-close:disabled { opacity: 0.55; cursor: not-allowed; }
  .table-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: auto; box-shadow: var(--shadow-sm); }
  .panel-head { padding: 17px 22px; border-bottom: 1px solid var(--line); background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent); }
  .panel-head h2 { font-size: 0.92rem; margin: 0; letter-spacing: -0.01em; font-weight: 750; color: var(--text-1); }
  .table-card table { width: 100%; border-collapse: collapse; min-width: 720px; font-size: 0.82rem; }
  .table-card th, .table-card td { padding: 14px 18px; text-align: left; border-bottom: 1px solid var(--line-2); }
  .table-card th { text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); font-size: 0.64rem; font-weight: 800; background: rgba(248,250,252,0.7); white-space: nowrap; }
  .table-card tbody tr:hover td { background: #f6f9fc; }
  .table-card td { color: var(--text-2); }
  .table-card td strong { color: var(--text-1); }
  .td-acts { text-align: right; white-space: nowrap; }
  .btn-ghost { border: 0; background: transparent; font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; margin-left: 6px; color: var(--blue); }
  .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-del { color: var(--red); }
  .empty-state { padding: 24px; color: var(--muted-2); font-size: 0.82rem; }
  .overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); display: grid; place-items: center; z-index: 100; }
  .modal { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 28px; max-width: 440px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
  .modal h3 { margin: 0 0 18px; font-size: 1.1rem; color: var(--ink-2); }
  .modal-fields { display: grid; gap: 14px; }
  .modal-fields label { display: grid; gap: 5px; font-size: 0.74rem; font-weight: 700; color: var(--muted); }
  .modal-fields input[type="date"], .modal-fields input[type="datetime-local"] { border: 1px solid var(--line); border-radius: 5px; padding: 9px 10px; font: inherit; background: var(--bg-input); color: var(--ink-2); }
  .check-row { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--ink-2); }
  .check-row input { width: 16px; height: 16px; }
  .modal-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .modal-note { margin: 0 0 4px; color: var(--muted); font-size: 0.82rem; line-height: 1.5; }
  .modal-narrow { max-width: 400px; }
  .btn-del-solid { border: 1px solid var(--red); border-radius: 7px; padding: 9px 16px; background: var(--red); color: #fff; font: inherit; font-size: 0.78rem; font-weight: 750; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.12s; }
  .btn-del-solid:hover { background: var(--red-dark); border-color: var(--red-dark); }
  .btn-del-solid:disabled { opacity: 0.55; cursor: not-allowed; }
  .modal-acts .btn-ghost { border: 0; background: transparent; font: inherit; font-size: 0.8rem; color: var(--muted); cursor: pointer; padding: 8px 12px; }
  @media (max-width: 700px) {
    .dash-header { flex-direction: column; align-items: start; }
    .setting-form { grid-template-columns: 1fr; }
  }
</style>
