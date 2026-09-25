<script lang="ts">
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  let { data } = $props();
  type Period = (typeof data.periods)[number];
  // Seeded once, then owned by the page so writes can update rows in place.
  const initialPeriods = (): Period[] => data.periods;
  let periods = $state(initialPeriods());
  let saving = $state(false);
  // Seeded once, then owned by the form; reload() re-seeds after a write.
  const initialDates = () => ({
    starts: data.openPeriod?.startsOn ?? '',
    ends: data.openPeriod?.endsOn ?? '',
    due: data.openPeriod?.dueOnInput ?? '',
  });
  const seeded = initialDates();
  let editStarts = $state(seeded.starts);
  let editEnds = $state(seeded.ends);
  let editDue = $state(seeded.due);
  let showCreate = $state(false);
  let deleteTarget: Period | null = $state(null);
  let deleting = $state(false);
  let newStarts = $state('');
  let newEnds = $state('');
  let newDue = $state('');
  let newOpen = $state(true);
  const openPeriod = $derived(periods.find((p) => p.is_open) ?? null);

  const fromLocalInput = (v: string) => (v ? `${v}:00+05:30` : '');

  /** Re-reads periods after a write so the table reflects the server. */
  const toLocalInput = (iso: string) => {
    const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    return m ? `${m[1]}T${m[2]}:${m[3]}` : iso.slice(0, 16);
  };

  async function reload() {
    const d = await (await fetch('/api/periods')).json();
    periods = d.periods ?? [];
    const op = periods.find((p: Period) => p.is_open);
    if (op) { editStarts = op.starts_on; editEnds = op.ends_on; editDue = toLocalInput(op.due_on); }
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
    await reload();
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
    await reload();
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
    await reload();
  }
  async function deletePeriodConfirm() {
    if (!deleteTarget || deleting) return;
    deleting = true;
    const res = await fetch(`/api/periods?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
    deleting = false;
    if (!res.ok) { show('Unable to delete period.', 'err'); return; }
    show('Period deleted.');
    deleteTarget = null;
    await reload();
  }
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
</script>

<svelte:head><title>Reporting periods · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <PageHeader title="Reporting periods" sub="Weekly schedule configuration">
    {#snippet actions()}
      <NotificationBell /><button class="btn btn-primary" onclick={() => (showCreate = true)}>+ New period</button>
    {/snippet}
  </PageHeader>
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
          <button class="btn btn-primary" onclick={saveOpen} disabled={saving}>Save changes</button>
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

  {#if deleteTarget}
    <Modal title="Delete {deleteTarget.label || deleteTarget.id}?" size="sm" onclose={() => (deleteTarget = null)}>
      <p class="modal-note">Only periods without reports can be deleted. This cannot be undone.</p>
      <div class="modal-acts">
        <button class="btn" onclick={() => (deleteTarget = null)}>Cancel</button>
        <button class="btn-del-solid" onclick={deletePeriodConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete period'}</button>
      </div>
    </Modal>
  {/if}

  {#if showCreate}
    <Modal title="Create reporting period" onclose={() => (showCreate = false)}>
      <div class="modal-fields">
        <label>Period starts<input type="date" bind:value={newStarts} /></label>
        <label>Period ends<input type="date" bind:value={newEnds} /></label>
        <label>Submission deadline<input type="datetime-local" bind:value={newDue} /></label>
        <label class="check-row"><input type="checkbox" bind:checked={newOpen} /> Open for submissions</label>
      </div>
      <div class="modal-acts">
        <button class="btn" onclick={() => (showCreate = false)}>Cancel</button>
        <button class="btn btn-primary" onclick={createPeriod} disabled={saving}>Create period</button>
      </div>
    </Modal>
  {/if}
</main>

<style>
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
  .td-acts { text-align: right; white-space: nowrap; }
  .btn-del { color: var(--red); }
  .empty-state { padding: 24px; color: var(--muted-2); font-size: 0.82rem; }
  .modal-fields { display: grid; gap: 14px; }
  .modal-fields label { display: grid; gap: 5px; font-size: 0.74rem; font-weight: 700; color: var(--muted); }
  .modal-fields input[type="date"], .modal-fields input[type="datetime-local"] { border: 1px solid var(--line); border-radius: 5px; padding: 9px 10px; font: inherit; background: var(--bg-input); color: var(--ink-2); }
  .check-row { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--ink-2); }
  .check-row input { width: 16px; height: 16px; }
  .modal-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .modal-note { margin: 0 0 4px; color: var(--muted); font-size: 0.82rem; line-height: 1.5; }
  .btn-del-solid { border: 1px solid var(--red); border-radius: 7px; padding: 9px 16px; background: var(--red); color: #fff; font: inherit; font-size: 0.78rem; font-weight: 750; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.12s; }
  .btn-del-solid:hover { background: var(--red-dark); border-color: var(--red-dark); }
  .btn-del-solid:disabled { opacity: 0.55; cursor: not-allowed; }
  @media (max-width: 700px) {
    .setting-form { grid-template-columns: 1fr; }
  }
</style>
