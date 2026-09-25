<script lang="ts">
  import { onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import type { AuditFilters } from './+page.server';

  let { data } = $props();
  // Page size is a server constant; read it through a closure so the value
  // tracks the load rather than being pinned at component init.
  const pageSize = () => data.pageSize;

  const ACTIONS = [
    'REPORT_SAVED', 'REPORT_SUBMITTED', 'REPORT_REOPENED', 'APPROVED', 'CHANGES_REQUIRED',
    'PERIOD_UPDATED', 'DEPARTMENT_UPDATED', 'USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
  ];

  let formEl = $state<HTMLFormElement | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  type FilterPatch = Partial<AuditFilters>;

  function filterHref(patch: FilterPatch, targetPage = 1): string {
    const q = new URLSearchParams();
    const next = { ...data.filters, ...patch };
    if (next.q) q.set('q', next.q);
    if (next.action) q.set('action', next.action);
    if (next.from) q.set('from', next.from);
    if (next.to) q.set('to', next.to);
    if (targetPage > 1) q.set('page', String(targetPage));
    const s = q.toString();
    return s ? `/admin/audit?${s}` : '/admin/audit';
  }

  function submit() {
    goto(filterHref(formValues()), { keepFocus: true, noScroll: true });
  }

  function formValues(): AuditFilters {
    const fd = new FormData(formEl ?? undefined);
    return {
      q: String(fd.get('q') ?? '').trim(),
      action: String(fd.get('action') ?? ''),
      from: String(fd.get('from') ?? ''),
      to: String(fd.get('to') ?? ''),
    };
  }

  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(submit, 300);
  }

  onDestroy(() => clearTimeout(searchTimer));

  const actionLabel = (a: string) => ({
    REPORT_SAVED: 'Draft saved', REPORT_SUBMITTED: 'Submitted for review', REPORT_REOPENED: 'Reopened for editing',
    APPROVED: 'Approved', CHANGES_REQUIRED: 'Changes requested', PERIOD_UPDATED: 'Period updated',
    DEPARTMENT_UPDATED: 'Department updated', USER_CREATED: 'User created', USER_UPDATED: 'User updated',
    USER_ACTIVATED: 'User activated', USER_DEACTIVATED: 'User deactivated',
  })[a] ?? a.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  const entityLabel = (t: string) =>
    ({ REPORT: 'Weekly report', USER: 'User account', DEPARTMENT: 'Department', REPORTING_PERIOD: 'Reporting period' })[t] ?? t;

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
  <PageHeader title="Audit history" sub="{data.total} event{data.total === 1 ? '' : 's'}">
    {#snippet actions()}
      <NotificationBell />
    {/snippet}
  </PageHeader>
  <form class="filter-bar" method="GET" action="/admin/audit" bind:this={formEl}>
    <input class="filter-search" type="search" name="q" placeholder="Search actor…" value={data.filters.q} oninput={onSearchInput} />
    <select class="filter-select" name="action" value={data.filters.action} onchange={submit}>
      <option value="">All actions</option>
      {#each ACTIONS as a}
        <option value={a}>{actionLabel(a)}</option>
      {/each}
    </select>
    <label class="filter-date">From <input type="date" name="from" value={data.filters.from} onchange={submit} /></label>
    <label class="filter-date">To <input type="date" name="to" value={data.filters.to} onchange={submit} /></label>
    <a class="btn-link" href="/admin/audit" aria-disabled={!data.filters.q && !data.filters.action && !data.filters.from && !data.filters.to}>Reset</a>
  </form>
  <section class="table-card">
    <table>
      <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
      <tbody>
        {#if !data.events.length}
          <tr><td colspan="4" class="empty-row">No audit events match your filters.</td></tr>
        {:else}
          {#each data.events as e}
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
  {#if data.total > pageSize()}
    <div class="pager">
      {#if data.page > 1}
        <a class="btn-link" href={filterHref({}, data.page - 1)}>‹ Prev</a>
      {:else}
        <span class="btn-link disabled">‹ Prev</span>
      {/if}
      <span class="pager-info">Page {data.page} of {data.pages}</span>
      {#if data.page < data.pages}
        <a class="btn-link" href={filterHref({}, data.page + 1)}>Next ›</a>
      {:else}
        <span class="btn-link disabled">Next ›</span>
      {/if}
    </div>
  {/if}
</main>

<style>
  .filter-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 14px; box-shadow: var(--shadow-xs); }
  .filter-search, .filter-select, .filter-date input {
    border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1);
    font-size: 0.82rem; padding: 9px 11px; box-shadow: var(--shadow-xs);
    transition: border-color 0.13s ease, box-shadow 0.13s ease;
  }
  .filter-search:focus, .filter-select:focus, .filter-date input:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .filter-search { width: 220px; }
  .filter-date { display: inline-flex; align-items: center; gap: 6px; color: var(--text-3); font-size: 0.8rem; font-weight: 600; }
  .filter-date input { padding: 6px 8px; }
  .btn-link {
    border: 0; background: none; color: var(--blue); font-size: 0.8rem; font-weight: 700; cursor: pointer; padding: 6px 8px;
  }
  .btn-link:hover:not(:disabled) { text-decoration: underline; }
  .btn-link:disabled { color: var(--muted-3); cursor: default; }
  .td-time { min-width: 150px; }
  .time-ago { display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-1); }
  .time-full { display: block; color: var(--muted-2); font-size: 0.68rem; margin-top: 2px; }
  .audit-pill { display: inline-flex; align-items: center; font-size: 0.66rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--line-light); color: var(--muted); white-space: nowrap; }
  .audit-pill.pill-ok { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .audit-pill.pill-sub { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .entity-label { color: var(--text-3); font-size: 0.78rem; }
  .empty-row { text-align: center; padding: 28px; color: var(--muted-2); font-size: 0.82rem; }
  .pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 18px; }
  .pager-info { font-size: 0.78rem; color: var(--muted); }
</style>
