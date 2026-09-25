<script lang="ts">
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';

  let { data } = $props();
  const reports = $derived(data.reports);
  const currentPeriod = $derived(data.currentPeriodLabel);
  const currentStatus = $derived(data.currentStatus ?? '');
  let periodFilter = $state('');
  let statusFilter = $state('');
  let search = $state('');
  const visible = $derived(
    reports.filter(
      (r) =>
        (!periodFilter || r.period_id === periodFilter) &&
        (!statusFilter || r.status === statusFilter) &&
        (!search.trim() || r.period_label.toLowerCase().includes(search.trim().toLowerCase())),
    ),
  );
  const filtersActive = $derived(Boolean(periodFilter || statusFilter || search.trim()));
  function resetFilters() {
    periodFilter = '';
    statusFilter = '';
    search = '';
  }
  const downloadHref = $derived(() => {
    const q = new URLSearchParams();
    if (periodFilter) q.set('period', periodFilter);
    if (statusFilter) q.set('status', statusFilter);
    const s = q.toString();
    return `/api/reports/current/export${s ? `?${s}` : ''}`;
  });
  const total = $derived(reports.length);
  const draft = $derived(reports.filter((r) => r.status === 'DRAFT').length);
  const submitted = $derived(reports.filter((r) => r.status === 'SUBMITTED').length);
  const approved = $derived(reports.filter((r) => r.status === 'APPROVED').length);
</script>

<svelte:head><title>My reports · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
    <PageHeader title="My reports" sub={currentPeriod || 'All periods'}>
      {#snippet actions()}
        <NotificationBell />
        <a href="/reports/current" class="btn btn-primary"
          >{['Approved', 'Submitted'].includes(currentStatus) ? 'View current report →' : 'Open current report →'}</a
        >
      {/snippet}
    </PageHeader>

    <div class="stat-strip" aria-label="Report totals">
      <span><strong>{total}</strong> report{total === 1 ? '' : 's'}</span>
      <span class="stat-sep" aria-hidden="true">·</span>
      <span><strong>{draft}</strong> draft{draft === 1 ? '' : 's'}</span>
      <span class="stat-sep" aria-hidden="true">·</span>
      <span><strong>{submitted}</strong> submitted</span>
      <span class="stat-sep" aria-hidden="true">·</span>
      <span><strong>{approved}</strong> approved</span>
    </div>

    <section class="reports-panel">
      <div class="panel-head">
        <h2>Report history</h2>
        <div class="download-filters">
          <input
            class="hist-search"
            type="search"
            placeholder="Search weeks…"
            aria-label="Search report history"
            bind:value={search}
          />
          <select bind:value={periodFilter} aria-label="Filter by period">
            <option value="">All periods</option>
            {#each reports as h}
              <option value={h.period_id}>{h.period_label}</option>
            {/each}
          </select>
          <select bind:value={statusFilter} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="DRAFT">Drafts only</option>
            <option value="SUBMITTED">Submitted only</option>
            <option value="APPROVED">Approved only</option>
            <option value="CHANGES_REQUIRED">Changes required</option>
          </select>
          {#if filtersActive}<button class="btn" onclick={resetFilters}>Reset</button>{/if}
          <a class="btn" href={downloadHref()}>Download CSV</a>
        </div>
      </div>
      {#if visible.length}
        {#each visible as item}
          <a class="report-row-link" href="/reports/{item.id}">
            <div class="report-meta">
              <strong class="report-period">{item.period_label}</strong>
              <span class="report-date">Updated {new Date(item.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <StatusPill status={item.status} detail={item.status === 'DRAFT' ? `${item.completion}%` : undefined} />
            <span class="report-view">View →</span>
          </a>
        {/each}
      {:else}
        {#if filtersActive}
          <div class="reports-empty">No reports match these filters. <button class="link-btn" onclick={resetFilters}>Clear filters →</button></div>
        {:else}
          <div class="reports-empty">No reports yet. <a href="/reports/current">Start your first one →</a></div>
        {/if}
      {/if}
    </section>
</main>

<style>
  .stat-strip { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; font-size: 0.82rem; color: var(--text-3); margin-bottom: 20px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 20px; box-shadow: var(--shadow-xs); }
  .stat-strip strong { color: var(--text-1); font-weight: 800; }
  .stat-sep { color: var(--muted-3); }
  .reports-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); }
  .download-filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .download-filters select, .hist-search { font: inherit; font-size: 0.76rem; padding: 7px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1); box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .download-filters select:focus, .hist-search:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .hist-search { width: 170px; }
  .hist-search::placeholder { color: var(--muted-3); }
  .report-row-link { display: flex; align-items: center; gap: 14px; padding: 15px 22px; border-bottom: 1px solid var(--line-2); text-decoration: none; transition: background 0.1s ease; }
  .report-row-link:last-child { border-bottom: 0; }
  .report-row-link:hover { background: #f6f9fc; }
  .report-meta { min-width: 0; flex: 1; }
  .report-period { display: block; font-size: 0.86rem; color: var(--text-1); margin-bottom: 2px; font-weight: 700; }
  .report-date { display: block; font-size: 0.72rem; color: var(--text-3); }
  .report-view { flex: none; font-size: 0.73rem; font-weight: 700; color: var(--blue); }
  .reports-empty { padding: 40px 20px; text-align: center; color: var(--muted-2); font-size: 0.8rem; }
  .reports-empty a { color: var(--blue); text-decoration: none; font-weight: 700; }
  .link-btn { border: 0; background: transparent; padding: 0; font: inherit; font-size: 0.8rem; font-weight: 700; color: var(--accent); cursor: pointer; }
  .link-btn:hover { text-decoration: underline; }
  @media (max-width: 800px) {
    .hist-search { width: 100%; }
  }
</style>