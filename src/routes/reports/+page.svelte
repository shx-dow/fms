<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  let currentPeriod = $state('');
  let currentStatus = $state('');
  let loading = $state(true);
  let loadError = $state('');
  let history: {
    id: string;
    period_id: string;
    period_label: string;
    status: string;
    completion: number;
    updated_at: string;
    submitted_at?: string;
  }[] = $state([]);
  let periodFilter = $state('');
  let statusFilter = $state('');
  let search = $state('');
  const visible = $derived(
    history.filter(
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
  onMount(async () => {
    try {
      const res = await fetch('/api/reports');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Unable to load reports.');
      currentPeriod = d.policy?.period?.label ?? '';
      currentStatus =
        d.report?.status === 'SUBMITTED' ? 'Submitted'
        : d.report?.status === 'APPROVED' ? 'Approved'
        : d.report?.status === 'CHANGES_REQUIRED' ? 'Changes required'
        : d.report?.status ? 'Draft' : '—';
      history = d.reports ?? [];
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Unable to load reports.';
      show(loadError, 'err');
    } finally { loading = false; }
  });
  const total = $derived(history.length);
  const draft = $derived(history.filter(r => r.status === 'DRAFT').length);
  const submitted = $derived(history.filter(r => r.status === 'SUBMITTED').length);
  const approved = $derived(history.filter(r => r.status === 'APPROVED').length);
</script>

<svelte:head><title>My reports · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  {#if loading}
    <div class="loading-panel"><span class="spinner"></span><span>Loading reports…</span></div>
  {:else if loadError}
    <div class="load-error" role="alert">
      <strong>Could not load reports.</strong>
      <span>{loadError}</span>
      <a href="/reports" onclick={(e) => { e.preventDefault(); location.reload(); }}>Try again</a>
    </div>
  {:else}
    <header class="dash-header">
      <div>
        <h1>My reports</h1>
        <span class="dash-period">{currentPeriod || 'All periods'}</span>
      </div>
      <div class="dash-actions">
        <NotificationBell />
        <a href="/reports/current" class="dash-cta"
          >{['Approved', 'Submitted'].includes(currentStatus) ? 'View current report →' : 'Open current report →'}
        </a>
      </div>
    </header>

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
            {#each history as h}
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
          {#if filtersActive}<button class="dl-link dl-reset" onclick={resetFilters}>Reset</button>{/if}
          <a class="dl-link" href={downloadHref()}>Download CSV</a>
        </div>
      </div>
      {#if visible.length}
        {#each visible as item}
          <a class="report-row-link" href="/reports/{item.id}">
            <div class="report-meta">
              <strong class="report-period">{item.period_label}</strong>
              <span class="report-date">Updated {new Date(item.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <span class="report-pill" class:r-draft={item.status === 'DRAFT'} class:r-sub={item.status === 'SUBMITTED'} class:r-ok={item.status === 'APPROVED'} class:r-chg={item.status === 'CHANGES_REQUIRED'}>
              {item.status === 'CHANGES_REQUIRED' ? 'Changes requested' : item.status === 'DRAFT' ? `Draft · ${item.completion}%` : item.status === 'APPROVED' ? 'Approved' : 'Submitted'}
            </span>
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
  {/if}
</main>

<style>
  .loading-panel { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: var(--muted-3); font-size: 0.88rem; }
  .load-error { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border: 1px solid var(--red-border); border-radius: 8px; background: var(--red-bg-alt); color: var(--red); font-size: 0.82rem; flex-wrap: wrap; }
  .load-error strong { font-weight: 800; }
  .load-error a { margin-left: auto; color: var(--red); font-weight: 800; text-decoration: none; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px 24px; box-shadow: var(--shadow-sm); }
  .dash-header h1 { font-size: 1.55rem; letter-spacing: -0.03em; margin: 0 0 4px; font-weight: 750; color: var(--text-1); }
  .dash-period { font-size: 0.84rem; color: var(--text-3); }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 11px 20px; border-radius: 8px; background: var(--navy); color: var(--paper); text-decoration: none; font-size: 0.82rem; font-weight: 750; white-space: nowrap; box-shadow: var(--shadow-sm); transition: background 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease; }
  .dash-cta:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .stat-strip { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; font-size: 0.82rem; color: var(--text-3); margin-bottom: 20px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 20px; box-shadow: var(--shadow-xs); }
  .stat-strip strong { color: var(--text-1); font-weight: 800; }
  .stat-sep { color: var(--muted-3); }
  .reports-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); }
  .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 17px 22px; border-bottom: 1px solid var(--line); background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent); }
  .panel-head h2 { font-size: 0.92rem; margin: 0; letter-spacing: -0.01em; font-weight: 750; color: var(--text-1); }
  .download-filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .download-filters select, .hist-search { font: inherit; font-size: 0.76rem; padding: 7px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1); box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .download-filters select:focus, .hist-search:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .hist-search { width: 170px; }
  .hist-search::placeholder { color: var(--muted-3); }
  .dl-link { font: inherit; font-size: 0.73rem; font-weight: 700; color: var(--accent-strong); text-decoration: none; border: 1px solid var(--line); border-radius: 7px; padding: 7px 11px; background: var(--panel); cursor: pointer; box-shadow: var(--shadow-xs); transition: all 0.12s; white-space: nowrap; }
  .dl-link:hover { background: var(--bg-hover); border-color: var(--blue-border); }
  .dl-reset { color: var(--muted); }
  .report-row-link { display: flex; align-items: center; gap: 14px; padding: 15px 22px; border-bottom: 1px solid var(--line-2); text-decoration: none; transition: background 0.1s ease; }
  .report-row-link:last-child { border-bottom: 0; }
  .report-row-link:hover { background: #f6f9fc; }
  .report-meta { min-width: 0; flex: 1; }
  .report-period { display: block; font-size: 0.86rem; color: var(--text-1); margin-bottom: 2px; font-weight: 700; }
  .report-date { display: block; font-size: 0.72rem; color: var(--text-3); }
  .report-pill { flex: none; font-size: 0.66rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.02em; border: 1px solid transparent; }
  .r-draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .r-sub { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .r-ok { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .r-chg { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .report-view { flex: none; font-size: 0.73rem; font-weight: 700; color: var(--blue); }
  .reports-empty { padding: 40px 20px; text-align: center; color: var(--muted-2); font-size: 0.8rem; }
  .reports-empty a { color: var(--blue); text-decoration: none; font-weight: 700; }
  .link-btn { border: 0; background: transparent; padding: 0; font: inherit; font-size: 0.8rem; font-weight: 700; color: var(--accent); cursor: pointer; }
  .link-btn:hover { text-decoration: underline; }
  @media (max-width: 800px) {
    .dash-header { flex-direction: column; align-items: start; }
    .hist-search { width: 100%; }
  }
</style>