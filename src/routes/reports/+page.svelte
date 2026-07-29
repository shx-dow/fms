<script lang="ts">
  let { data } = $props();
  import { onMount } from 'svelte';
  let currentPeriod = $state('');
  let currentStatus = $state('');
  let currentCompletion = $state(0);
  let loading = $state(true);
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
      currentPeriod = d.policy?.period?.label ?? '';
      currentStatus =
        d.report?.status === 'SUBMITTED'
          ? 'Submitted'
          : d.report?.status === 'APPROVED'
            ? 'Approved'
            : d.report?.status === 'CHANGES_REQUIRED'
              ? 'Changes required'
              : d.report?.status
                ? 'Draft'
                : '—';
      currentCompletion = d.report?.completion ?? 0;
      history = d.reports ?? [];
    } catch {
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Reports · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  <div class="breadcrumb">Faculty workspace <span>/</span> Reports</div>
  <div class="page-heading">
    <div>
      <div class="eyebrow">Faculty portal</div>
      <h1>Report history</h1>
      <p>Every weekly report, its status, and the last action taken.</p>
    </div>
    <a class="button" href="/reports/current">Open current report <span>→</span></a>
  </div>
  {#if loading}<div class="loading-state">
      <span class="spinner"></span><span>Loading reports…</span>
    </div>{:else}<section class="history report-list">
      {#if !history.length}<div class="empty-history">
          No reports have been created yet.
        </div>{:else}{#each history as item}<div class="report-row">
            <span
              ><strong>{item.period_label}</strong><small
                >{item.submitted_at
                  ? `Submitted ${new Date(item.submitted_at).toLocaleDateString()}`
                  : 'Not submitted'}</small
              ></span
            ><span class="status {item.status === 'CHANGES_REQUIRED' ? 'changes' : item.status.toLowerCase()}"
              >{item.status === 'CHANGES_REQUIRED'
                ? 'Changes requested'
                : item.status === 'DRAFT'
                  ? `Draft · ${item.completion}%`
                  : item.status[0] + item.status.slice(1).toLowerCase()}</span
            ><span>Updated {new Date(item.updated_at).toLocaleDateString()}</span>
            <a
              href={item.id === history[0]?.id ? '/reports/current' : `/calendar?date=${item.updated_at.slice(0, 10)}`}
              >View →</a
            >
            <a href="/api/reports/{item.id}/pdf" target="_blank" class="pdf-link">PDF</a>
          </div>{/each}{/if}
    </section>
    <p class="history-note">Use the <a href="/calendar">report calendar →</a> to browse activity by date.</p>{/if}
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
  .loading-state {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 0;
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
  .history-note {
    margin-top: 18px;
    color: #87969c;
    font-size: 0.8rem;
  }
  .history-note a {
    color: #087f73;
    text-decoration: none;
    font-weight: 750;
  }
  .report-row small {
    display: block;
    color: #87969c;
    font-size: 0.7rem;
    margin-top: 3px;
  }
  .empty-history {
    padding: 34px 20px;
    color: #71818a;
    font-size: 0.82rem;
  }
</style>
