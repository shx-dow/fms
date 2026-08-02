<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  let currentPeriod = $state('');
  let currentStatus = $state('');
  let loading = $state(true);
  let loadError = $state('');
  let history: {
    id: string;
    period_label: string;
    status: string;
    completion: number;
    updated_at: string;
    submitted_at?: string;
  }[] = $state([]);
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
        <a href="/reports/current" class="dash-cta"
          >{['Approved', 'Submitted'].includes(currentStatus) ? 'View current report →' : 'Open current report →'}
        </a>
      </div>
    </header>

    <div class="dash-metrics">
      <div>
        <span>Total reports</span>
        <strong>{total}</strong>
        <small>All time</small>
      </div>
      <div>
        <span>Drafts</span>
        <strong>{draft}</strong>
        <small>Awaiting submission</small>
      </div>
      <div>
        <span>Submitted</span>
        <strong>{submitted}</strong>
        <small>Under review</small>
      </div>
      <div>
        <span>Approved</span>
        <strong>{approved}</strong>
        <small>Completed</small>
      </div>
    </div>

    <section class="reports-panel">
      <div class="panel-head">
        <h2>Report history</h2>
      </div>
      {#if history.length}
        {#each history as item}
          <a class="report-row-link" href="/reports/current">
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
        <div class="reports-empty">No reports yet. <a href="/reports/current">Start your first one →</a></div>
      {/if}
    </section>
  {/if}
</main>

<style>
  .loading-panel { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: #71818a; font-size: 0.88rem; }
  .load-error { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border: 1px solid #e8d4d4; border-radius: 8px; background: #fdf0ef; color: #8f413b; font-size: 0.82rem; flex-wrap: wrap; }
  .load-error strong { font-weight: 800; }
  .load-error a { margin-left: auto; color: #a84f42; font-weight: 800; text-decoration: none; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dbe3e7; border-top-color: #145b78; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: #667477; }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: #17252d; color: #f4f6f5; text-decoration: none; font-size: 0.78rem; font-weight: 700; white-space: nowrap; transition: background 0.14s ease; }
  .dash-cta:hover { background: #294a5a; }
  .dash-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #dbe3e7; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
  .dash-metrics > div { background: #fdfcf9; padding: 18px 20px; }
  .dash-metrics span:first-child { display: block; color: #71818a; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin-bottom: 8px; }
  .dash-metrics strong { display: block; font-size: 1.7rem; letter-spacing: -0.04em; line-height: 1.1; color: #1b2b36; }
  .dash-metrics small { display: block; color: #71818a; font-size: 0.7rem; margin-top: 5px; }
  .reports-panel { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #dbe3e7; }
  .panel-head h2 { font-size: 0.9rem; margin: 0; letter-spacing: -0.01em; }
  .report-row-link { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid #e8eeec; text-decoration: none; transition: background 0.1s ease; }
  .report-row-link:last-child { border-bottom: 0; }
  .report-row-link:hover { background: #f4f6f5; }
  .report-meta { min-width: 0; flex: 1; }
  .report-period { display: block; font-size: 0.82rem; color: #1b2b36; margin-bottom: 2px; }
  .report-date { display: block; font-size: 0.7rem; color: #87969c; }
  .report-pill { flex: none; font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; letter-spacing: 0.02em; }
  .r-draft { background: #f0d48a; color: #7a6420; }
  .r-sub { background: #8bbdd9; color: #1a5a7a; }
  .r-ok { background: #7fbf97; color: #1a5a3a; }
  .r-chg { background: #e09080; color: #7a3028; }
  .report-view { flex: none; font-size: 0.73rem; font-weight: 700; color: #145b78; }
  .reports-empty { padding: 40px 20px; text-align: center; color: #87969c; font-size: 0.8rem; }
  .reports-empty a { color: #145b78; text-decoration: none; font-weight: 700; }
  @media (max-width: 800px) {
    .dash-header { flex-direction: column; align-items: start; }
    .dash-metrics { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 500px) {
    .dash-metrics { grid-template-columns: 1fr; }
  }
</style>