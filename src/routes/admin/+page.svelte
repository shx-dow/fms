<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  type ReviewItem = { id: string; status: string; updated_at: string; faculty_name: string; period_label: string; completion: number };
  type FacultyStatus = { id: string; name: string; email: string; status: string | null; completion: number | null; submitted_at: string | null };
  type AuditEvent = { id: string; action: string; created_at: string; actor_name: string | null };
  const isAdmin = $derived(page.data.user?.role === 'ADMIN');
  let loading = $state(true);
  let error = $state('');
  let facultyCount = $state(0);
  let submittedCount = $state(0);
  let reviewNeeded = $state(0);
  let items: ReviewItem[] = $state([]);
  let missingReports: { id: string; name: string; email: string }[] = $state([]);
  let missingPeriod = $state('');
  let trends: { period: string; total: number; submitted: number; submission_rate: number; avg_completion: number }[] = $state([]);
  let currentPeriod: { period: string; faculty_count: number; submitted_count: number } | null = $state(null);
  let facultyStatus: FacultyStatus[] = $state([]);
  let auditEvents: AuditEvent[] = $state([]);
  onMount(async () => {
    try {
      if (isAdmin) {
        const [trendsRes, reviewsRes, missingRes, facultyRes, auditRes] = await Promise.all([
          fetch('/api/dashboard/trends'),
          fetch('/api/reviews'),
          fetch('/api/reports/missing'),
          fetch('/api/dashboard/faculty'),
          fetch('/api/audit'),
        ]);
        const trendsData = await trendsRes.json();
        const reviews = await reviewsRes.json();
        const missing = await missingRes.json();
        const faculty = await facultyRes.json();
        const audit = await auditRes.json();
        trends = trendsData.trends ?? [];
        currentPeriod = trendsData.currentPeriod ?? null;
        facultyCount = currentPeriod?.faculty_count ?? 0;
        submittedCount = currentPeriod?.submitted_count ?? 0;
        items = reviews.reports ?? [];
        reviewNeeded = items.filter((r: ReviewItem) => r.status === 'SUBMITTED' || r.status === 'CHANGES_REQUIRED').length;
        missingReports = missing.missing ?? [];
        missingPeriod = missing.periodLabel ?? '';
        facultyStatus = faculty.faculty ?? [];
        auditEvents = (audit.events ?? []).slice(0, 8);
      } else {
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
      }
    } catch { error = 'Unable to load department data.'; }
    finally { loading = false; }
  });
  function auditPill(action: string) {
    if (action === 'APPROVED') return 'r-ok';
    if (action === 'CHANGES_REQUIRED' || action === 'REPORT_REOPENED') return 'r-chg';
    return 'r-sub';
  }
  function fmtAudit(iso: string) {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  const rateDelta = $derived(
    trends.length >= 2 ? Number(trends[0].submission_rate ?? 0) - Number(trends[1].submission_rate ?? 0) : null,
  );
</script>

<svelte:head><title>{isAdmin ? 'Administration' : 'Department overview'} · Faculty Reporting System</title></svelte:head>

{#if isAdmin}
  <main class="shell">
    {#if loading}
      <div class="dash-loading"><span class="spinner"></span><span>Loading administration…</span></div>
    {:else if error}
      <div class="dash-error">{error}</div>
    {:else}
      <header class="dash-header">
        <div>
          <h1>Administration</h1>
          <span class="dash-period">{missingPeriod || 'Current reporting period'}</span>
        </div>
        <div class="dash-actions">
          <NotificationBell />
          <a class="btn-quick" href="/admin/settings">Manage periods</a>
        </div>
      </header>
      <div class="dash-metrics wide">
        <div><span>Faculty</span><strong>{facultyCount}</strong><small>in the department</small></div>
        <div><span>Submitted</span><strong>{submittedCount}</strong><small>for the open period</small>{#if rateDelta !== null}<em class="metric-delta" class:up={rateDelta >= 0} class:down={rateDelta < 0}>{rateDelta >= 0 ? '↑' : '↓'} {Math.abs(rateDelta)}% vs last period</em>{/if}</div>
        <div><span>Review needed</span><strong>{reviewNeeded}</strong><small>awaiting attention</small></div>
        <div><span>Missing</span><strong>{missingReports.length}</strong><small>not yet submitted</small></div>
      </div>
      <div class="quick-actions">
        <a href="/admin/reports">Review queue</a>
        <a href="/admin/faculty">Faculty directory</a>
        <a href="/admin/audit">Audit history</a>
      </div>
      <section class="admin-card">
        <div class="panel-head"><h2>Faculty submissions</h2><span class="head-tag">{missingPeriod}</span></div>
        <table class="trends-table">
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Status</th>
              <th>Completion</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {#if !facultyStatus.length}
              <tr><td colspan="4" class="empty-state">No faculty found.</td></tr>
            {:else}
              {#each facultyStatus as f}
                <tr>
                  <td><span class="row-name"><strong>{f.name}</strong><span class="row-email">{f.email}</span></span></td>
                  <td>
                    <span class="report-pill"
                      class:r-ok={f.status === 'APPROVED'}
                      class:r-sub={f.status === 'SUBMITTED' || f.status === 'CHANGES_REQUIRED'}
                      class:r-drf={!f.status || f.status === 'DRAFT'}>
                      {!f.status || f.status === 'DRAFT' ? 'Not submitted' : f.status === 'CHANGES_REQUIRED' ? 'Changes required' : f.status[0] + f.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td>{f.completion ?? 0}%</td>
                  <td class="row-date">{f.submitted_at ? new Date(f.submitted_at).toLocaleDateString() : '—'}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </section>
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
      <section class="admin-card audit-card">
        <div class="panel-head"><h2>Recent activity</h2><a href="/admin/audit">View all →</a></div>
        {#if !auditEvents.length}
          <div class="empty-state">No activity recorded yet.</div>
        {:else}
          {#each auditEvents as ev}
            <div class="admin-row static">
              <span class="row-name"><strong>{ev.actor_name ?? 'System'}</strong></span>
              <span class="report-pill {auditPill(ev.action)}">{ev.action.replaceAll('_', ' ').toLowerCase()}</span>
              <span class="row-date">{fmtAudit(ev.created_at)}</span>
            </div>
          {/each}
        {/if}
      </section>
    {/if}
  </main>
{:else}
  <main class="shell">
    {#if loading}
      <div class="dash-loading"><span class="spinner"></span><span>Loading overview…</span></div>
    {:else if error}
      <div class="dash-error">{error}</div>
    {:else}
      <header class="dash-header">
        <div>
          <h1>Department overview</h1>
          <span class="dash-period">Current reporting period</span>
        </div>
        <div class="dash-actions">
          <NotificationBell />
        </div>
      </header>
      <div class="dash-metrics">
        <div><span>Faculty</span><strong>{facultyCount}</strong><small>in department</small></div>
        <div><span>Submitted</span><strong>{submittedCount}</strong><small>{facultyCount ? Math.round((submittedCount / facultyCount) * 100) : 0}% rate</small>{#if rateDelta !== null}<em class="metric-delta" class:up={rateDelta >= 0} class:down={rateDelta < 0}>{rateDelta >= 0 ? '↑' : '↓'} {Math.abs(rateDelta)}% vs last period</em>{/if}</div>
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
{/if}

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: var(--muted-3); font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-error { padding: 16px 20px; background: var(--red-bg); color: var(--red); border-radius: 7px; font-size: 0.88rem; }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-period { font-size: 0.82rem; color: var(--muted); }
  .btn-quick { flex: none; text-decoration: none; font-size: 0.75rem; font-weight: 800; color: #fff; background: var(--blue); padding: 8px 14px; border-radius: 6px; transition: background 0.14s ease; }
  .btn-quick:hover { background: var(--navy-3); }
  .dash-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
  .dash-metrics.wide { grid-template-columns: repeat(4, 1fr); }
  .dash-metrics > div { background: var(--panel); padding: 18px 20px; }
  .dash-metrics span:first-child { display: block; color: var(--muted-3); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin-bottom: 8px; }
  .dash-metrics strong { display: block; font-size: 1.7rem; letter-spacing: -0.04em; line-height: 1.1; color: var(--ink-2); }
  .dash-metrics small { display: block; color: var(--muted-3); font-size: 0.7rem; margin-top: 5px; }
  .metric-delta { display: block; font-style: normal; font-size: 0.7rem; font-weight: 700; margin-top: 5px; }
  .metric-delta.up { color: var(--green); }
  .metric-delta.down { color: var(--red); }
  .quick-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
  .quick-actions a { flex: none; text-decoration: none; font-size: 0.75rem; font-weight: 800; color: var(--blue); background: var(--bg-hover); border: 1px solid var(--line); padding: 8px 14px; border-radius: 6px; transition: background 0.14s ease, border-color 0.14s ease; }
  .quick-actions a:hover { background: var(--bg-hover); border-color: var(--blue-border); }
  .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .admin-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--line); }
  .panel-head h2 { font-size: 0.9rem; margin: 0; letter-spacing: -0.01em; }
  .panel-head a { color: var(--blue); text-decoration: none; font-size: 0.73rem; font-weight: 700; }
  .head-tag { font-size: 0.66rem; color: var(--muted-2); background: var(--bg-hover); padding: 3px 7px; border-radius: 4px; font-weight: 700; }
  .admin-row { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--line-2); text-decoration: none; transition: background 0.1s; }
  .admin-row:last-child { border-bottom: 0; }
  .admin-row:hover { background: var(--paper); }
  .admin-row.static:hover { background: transparent; }
  .row-name { min-width: 0; flex: 1; font-size: 0.82rem; color: var(--ink-2); }
  .row-name strong { display: block; }
  .row-email { display: block; color: var(--muted-2); font-size: 0.7rem; margin-top: 2px; }
  .row-date { flex: none; color: var(--muted-2); font-size: 0.7rem; }
  .row-act { flex: none; font-size: 0.73rem; font-weight: 700; color: var(--blue); }
  .report-pill { flex: none; font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; letter-spacing: 0.02em; }
  .r-sub { background: var(--blue-soft); color: var(--blue-dark); }
  .r-ok { background: var(--green-soft); color: var(--green); }
  .r-chg { background: var(--red-soft); color: var(--red-dark); }
  .r-drf { background: var(--line-light); color: var(--gray); }
  .empty-state { padding: 24px 20px; color: var(--muted-2); font-size: 0.8rem; }
  .missing-note { padding: 12px 20px; margin: 0; color: var(--muted-2); font-size: 0.74rem; }
  .trends-section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; margin-top: 24px; }
  .trends-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .trends-table th { position: sticky; top: 0; z-index: 1; text-align: left; padding: 12px 20px; background: var(--bg-hover); color: var(--muted); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--line); }
  .trends-table td { padding: 14px 20px; border-bottom: 1px solid var(--line-2); color: var(--ink-2); }
  .trends-table tr:last-child td { border-bottom: 0; }
  .trend-pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; }
  .trend-pill.trend-ok { background: var(--green-soft); color: var(--green); }
  .trend-pill.trend-mid { background: var(--warn-soft); color: var(--warn-dark); }
  .trend-pill.trend-low { background: var(--red-soft); color: var(--red-dark); }
  .audit-card { margin-top: 24px; }
  @media (max-width: 900px) {
    .dash-metrics.wide { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 800px) {
    .dash-header { flex-direction: column; align-items: start; }
    .admin-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .dash-metrics { grid-template-columns: 1fr; }
  }
</style>
