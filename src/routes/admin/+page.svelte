<script lang="ts">
  import { onMount } from 'svelte';
  type ReviewItem = { id: string; status: string; updated_at: string; faculty_name: string; period_label: string; completion: number };
  let loading = $state(true);
  let facultyCount = $state(0);
  let submittedCount = $state(0);
  let reviewNeeded = $state(0);
  let items: ReviewItem[] = $state([]);
  let missingReports: { id: string; name: string; email: string }[] = $state([]);
  let missingPeriod = $state('');
  let error = $state('');
  let trends: { period: string; total: number; submitted: number; submission_rate: number; avg_completion: number }[] = $state([]);
  let currentPeriod: { period: string; faculty_count: number; submitted_count: number } | null = $state(null);
  onMount(async () => {
    try {
      const [reviewsRes, missingRes, trendsRes] = await Promise.all([fetch('/api/reviews'), fetch('/api/reports/missing'), fetch('/api/dashboard/trends')]);
      const reviews = await reviewsRes.json();
      const missing = await missingRes.json();
      const trendsData = await trendsRes.json();
      items = reviews.reports ?? [];
      reviewNeeded = items.filter((r: ReviewItem) => r.status === 'SUBMITTED' || r.status === 'CHANGES_REQUIRED').length;
      submittedCount = items.filter((r: ReviewItem) => r.status === 'SUBMITTED' || r.status === 'APPROVED').length;
      missingReports = missing.missing ?? [];
      missingPeriod = missing.periodLabel ?? '';
      trends = trendsData.trends ?? [];
      currentPeriod = trendsData.currentPeriod ?? null;
      facultyCount = currentPeriod?.faculty_count ?? 0;
    } catch { error = 'Unable to load department data.'; }
    finally { loading = false; }
  });
</script>

<svelte:head><title>Department overview · Faculty Reporting System</title></svelte:head>
<main class="shell">
  {#if loading}
    <div class="dash-loading"><span class="spinner"></span><span>Loading overview…</span></div>
  {:else if error}
    <div class="dash-error">{error}</div>
  {:else}
    <header class="dash-header">
      <div>
        <h1>Department overview</h1>
        <span class="dash-period">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
      </div>
    </header>
    <div class="dash-metrics">
      <div><span>Faculty</span><strong>{facultyCount}</strong><small>in department</small></div>
      <div><span>Submitted</span><strong>{submittedCount}</strong><small>{facultyCount ? Math.round((submittedCount / facultyCount) * 100) : 0}% rate</small></div>
      <div><span>Review needed</span><strong>{reviewNeeded}</strong><small>awaiting attention</small></div>
    </div>
    <div class="admin-grid">
      <section class="admin-card">
        <div class="panel-head"><h2>Needs attention</h2><a href="/admin/reports">Open queue →</a></div>
        {#if !items.length}
          <div class="empty-state">No reports requiring attention.</div>
        {:else}
          {#each items.slice(0, 5) as item}
            <a class="admin-row" href="/admin/reports">
              <span class="row-name">{item.faculty_name}</span>
              <span class="report-pill" class:r-sub={item.status === 'SUBMITTED'} class:r-chg={item.status === 'CHANGES_REQUIRED'} class:r-ok={item.status === 'APPROVED'}>
                {item.status === 'CHANGES_REQUIRED' ? 'Changes required' : item.status[0] + item.status.slice(1).toLowerCase()}
              </span>
              <span class="row-date">{new Date(item.updated_at).toLocaleDateString()}</span>
              <span class="row-act">Review →</span>
            </a>
          {/each}
        {/if}
      </section>
      <section class="admin-card">
        <div class="panel-head"><h2>Missing reports</h2><span class="head-tag">{missingPeriod}</span></div>
        {#if !missingReports.length}
          <div class="empty-state">All faculty have submitted for this period.</div>
        {:else}
          {#each missingReports as m}
            <div class="admin-row static">
              <div class="row-name"><strong>{m.name}</strong><span class="row-email">{m.email}</span></div>
            </div>
          {/each}
          <p class="missing-note">{missingReports.length} faculty {missingReports.length === 1 ? 'has' : 'have'} not yet submitted for {missingPeriod}.</p>
        {/if}
      </section>
    </div>

    {#if trends.length > 0}
      <section class="trends-section">
        <div class="panel-head"><h2>Submission trends (last {trends.length} periods)</h2></div>
        <table class="trends-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Submitted / Total</th>
              <th>Submission rate</th>
              <th>Avg completion</th>
            </tr>
          </thead>
          <tbody>
            {#each trends as t}
              <tr>
                <td>{t.period}</td>
                <td>{t.submitted} / {t.total}</td>
                <td>
                  <span class="trend-pill" class:trend-ok={t.submission_rate >= 80} class:trend-mid={t.submission_rate >= 50 && t.submission_rate < 80} class:trend-low={t.submission_rate < 50}>
                    {t.submission_rate}%
                  </span>
                </td>
                <td>{t.avg_completion}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  {/if}
</main>

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: #71818a; font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dbe3e7; border-top-color: #145b78; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-error { padding: 16px 20px; background: #f9e9e7; color: #8f413b; border-radius: 7px; font-size: 0.88rem; }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: #667477; }
  .dash-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #dbe3e7; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
  .dash-metrics > div { background: #fdfcf9; padding: 18px 20px; }
  .dash-metrics span:first-child { display: block; color: #71818a; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin-bottom: 8px; }
  .dash-metrics strong { display: block; font-size: 1.7rem; letter-spacing: -0.04em; line-height: 1.1; color: #1b2b36; }
  .dash-metrics small { display: block; color: #71818a; font-size: 0.7rem; margin-top: 5px; }
  .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .admin-card { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #dbe3e7; }
  .panel-head h2 { font-size: 0.9rem; margin: 0; letter-spacing: -0.01em; }
  .panel-head a { color: #145b78; text-decoration: none; font-size: 0.73rem; font-weight: 700; }
  .head-tag { font-size: 0.66rem; color: #87969c; background: #eef3f5; padding: 3px 7px; border-radius: 4px; font-weight: 700; }
  .admin-row { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #e8eeec; text-decoration: none; transition: background 0.1s; }
  .admin-row:last-child { border-bottom: 0; }
  .admin-row:hover { background: #f4f6f5; }
  .admin-row.static:hover { background: transparent; }
  .row-name { min-width: 0; flex: 1; font-size: 0.82rem; color: #1b2b36; }
  .row-name strong { display: block; }
  .row-email { display: block; color: #87969c; font-size: 0.7rem; margin-top: 2px; }
  .row-date { flex: none; color: #87969c; font-size: 0.7rem; }
  .row-act { flex: none; font-size: 0.73rem; font-weight: 700; color: #145b78; }
  .report-pill { flex: none; font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; letter-spacing: 0.02em; }
  .r-sub { background: #e5f0f4; color: #145b78; }
  .r-ok { background: #e4f1eb; color: #24745b; }
  .r-chg { background: #f4eddd; color: #8a681d; }
  .empty-state { padding: 24px 20px; color: #87969c; font-size: 0.8rem; }
  .missing-note { padding: 12px 20px; margin: 0; color: #87969c; font-size: 0.74rem; }
  .trends-section { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; margin-top: 24px; }
  .trends-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .trends-table th { text-align: left; padding: 12px 20px; background: #eef3f5; color: #667477; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #dbe3e7; }
  .trends-table td { padding: 14px 20px; border-bottom: 1px solid #e8eeec; color: #1b2b36; }
  .trends-table tr:last-child td { border-bottom: 0; }
  .trend-pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; }
  .trend-pill.trend-ok { background: #e4f1eb; color: #24745b; }
  .trend-pill.trend-mid { background: #f4eddd; color: #8a681d; }
  .trend-pill.trend-low { background: #f8e8e5; color: #a84f42; }
  @media (max-width: 800px) {
    .dash-header { flex-direction: column; align-items: start; }
    .admin-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .dash-metrics { grid-template-columns: 1fr; }
  }
</style>