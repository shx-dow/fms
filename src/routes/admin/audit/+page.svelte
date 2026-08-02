<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  const PAGE_SIZE = 50;
  type Event = { action: string; entity_type: string; entity_id: string; created_at: string; actor_name?: string };
  const ACTIONS = [
    'REPORT_SAVED', 'REPORT_SUBMITTED', 'REPORT_REOPENED', 'APPROVED', 'CHANGES_REQUIRED',
    'PERIOD_UPDATED', 'DEPARTMENT_UPDATED', 'USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
  ];
  let events: Event[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  let total = $state(0);
  let page = $state(1);
  let search = $state('');
  let action = $state('');
  let from = $state('');
  let to = $state('');
  const pages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
  async function load() {
    loading = true;
    error = '';
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      if (search.trim()) q.set('q', search.trim());
      if (action) q.set('action', action);
      if (from) q.set('from', `${from}T00:00:00Z`);
      if (to) q.set('to', `${to}T23:59:59Z`);
      const res = await fetch(`/api/audit?${q}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      events = d.events ?? [];
      total = d.total ?? 0;
    } catch { error = 'Unable to load audit history.'; }
    finally { loading = false; }
  }
  onMount(load);
  onDestroy(() => clearTimeout(searchTimer));
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 300);
  }
  function applyFilters() { page = 1; load(); }
  function resetFilters() { search = ''; action = ''; from = ''; to = ''; page = 1; load(); }
  function goto(p: number) { if (p < 1 || p > pages || p === page) return; page = p; load(); }
  const actionLabel = (a: string) => ({
    REPORT_SAVED: 'Draft saved', REPORT_SUBMITTED: 'Submitted for review', REPORT_REOPENED: 'Reopened for editing',
    APPROVED: 'Approved', CHANGES_REQUIRED: 'Changes requested', PERIOD_UPDATED: 'Period updated',
    DEPARTMENT_UPDATED: 'Department updated', USER_CREATED: 'User created', USER_UPDATED: 'User updated',
    USER_ACTIVATED: 'User activated', USER_DEACTIVATED: 'User deactivated',
  })[a] ?? a.replaceAll('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  const entityLabel = (t: string) => ({ REPORT: 'Weekly report', USER: 'User account', DEPARTMENT: 'Department', REPORTING_PERIOD: 'Reporting period' })[t] ?? t;
  function timeAgo(dateStr: string) {
    const ms = Date.now() - new Date(dateStr).getTime();
    if (ms < 60000) return 'Just now';
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    if (ms < 604800000) return `${Math.floor(ms / 86400000)}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
  function actPill(action: string) {
    if (action === 'APPROVED') return 'pill-ok';
    if (action === 'CHANGES_REQUIRED' || action === 'REPORT_SUBMITTED') return 'pill-sub';
    return '';
  }
</script>

<svelte:head><title>Audit history · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <header class="dash-header">
    <div>
      <h1>Audit history</h1>
      <span class="dash-period">{total} event{total === 1 ? '' : 's'}</span>
    </div>
    <div class="dash-actions">
      <NotificationBell />
    </div>
  </header>
  <section class="filter-bar">
    <input class="filter-search" type="search" placeholder="Search actor…" bind:value={search} oninput={onSearchInput} />
    <select class="filter-select" bind:value={action} onchange={applyFilters}>
      <option value="">All actions</option>
      {#each ACTIONS as a}
        <option value={a}>{actionLabel(a)}</option>
      {/each}
    </select>
    <label class="filter-date">From <input type="date" bind:value={from} onchange={applyFilters} /></label>
    <label class="filter-date">To <input type="date" bind:value={to} onchange={applyFilters} /></label>
    <button class="btn-link" onclick={resetFilters} disabled={!search && !action && !from && !to}>Reset</button>
  </section>
  {#if loading}
    <div class="dash-loading"><span class="spinner"></span><span>Loading…</span></div>
  {:else if error}
    <div class="dash-error">{error}</div>
  {:else}
    <section class="table-card">
      <table>
        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
        <tbody>
          {#if !events.length}
            <tr><td colspan="4" class="empty-row">No audit events match your filters.</td></tr>
          {:else}
            {#each events as e}
              <tr>
                <td class="td-time">
                  <span class="time-ago">{timeAgo(e.created_at)}</span>
                  <span class="time-full">{new Date(e.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td><strong>{e.actor_name ?? 'System'}</strong></td>
                <td><span class="audit-pill {actPill(e.action)}">{actionLabel(e.action)}</span></td>
                <td><span class="entity-label">{entityLabel(e.entity_type)}</span></td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </section>
    {#if total > PAGE_SIZE}
      <div class="pager">
        <button class="btn-link" onclick={() => goto(page - 1)} disabled={page <= 1}>‹ Prev</button>
        <span class="pager-info">Page {page} of {pages}</span>
        <button class="btn-link" onclick={() => goto(page + 1)} disabled={page >= pages}>Next ›</button>
      </div>
    {/if}
  {/if}
</main>

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: var(--muted-3); font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-error { padding: 16px 20px; background: var(--red-bg); color: var(--red); border-radius: 7px; font-size: 0.88rem; }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-period { font-size: 0.82rem; color: var(--muted); }
  .filter-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .filter-search, .filter-select, .filter-date input {
    border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink-2);
    font-size: 0.8rem; padding: 7px 10px;
  }
  .filter-search { width: 200px; }
  .filter-date { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 0.78rem; }
  .filter-date input { padding: 6px 8px; }
  .btn-link {
    border: 0; background: none; color: var(--blue); font-size: 0.8rem; font-weight: 700; cursor: pointer; padding: 6px 8px;
  }
  .btn-link:hover:not(:disabled) { text-decoration: underline; }
  .btn-link:disabled { color: var(--muted-3); cursor: default; }
  .table-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: auto; }
  .table-card table { width: 100%; border-collapse: collapse; min-width: 600px; font-size: 0.78rem; }
  .table-card th, .table-card td { padding: 13px 16px; text-align: left; border-bottom: 1px solid var(--line-2); }
  .table-card th { text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-2); font-size: 0.62rem; font-weight: 800; }
  .table-card td { color: var(--muted); }
  .table-card td strong { color: var(--ink-2); }
  .td-time { min-width: 140px; }
  .time-ago { display: block; font-size: 0.78rem; color: var(--ink-2); }
  .time-full { display: block; color: var(--muted-2); font-size: 0.65rem; margin-top: 2px; }
  .audit-pill { display: inline-block; font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; }
  .audit-pill.pill-ok { background: var(--green-soft); color: var(--green); }
  .audit-pill.pill-sub { background: var(--blue-soft); color: var(--blue-dark); }
  .entity-label { color: var(--muted); font-size: 0.76rem; }
  .empty-row { text-align: center; padding: 24px; color: var(--muted-2); font-size: 0.8rem; }
  .pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 18px; }
  .pager-info { font-size: 0.78rem; color: var(--muted); }
  @media (max-width: 800px) { .dash-header { flex-direction: column; align-items: start; } }
</style>
