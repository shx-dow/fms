<script lang="ts">
  import { onMount } from 'svelte';
  type ReviewItem = {
    id: string;
    status: string;
    updated_at: string;
    faculty_name: string;
    period_label: string;
    completion: number;
  };
  let loading = $state(true);
  let facultyCount = $state(0);
  let submittedCount = $state(0);
  let reviewNeeded = $state(0);
  let items: ReviewItem[] = $state([]);
  let missingReports: { id: string; name: string; email: string }[] = $state([]);
  let missingPeriod = $state('');
  let error = $state('');
  onMount(async () => {
    try {
      const [reviewsRes, deptsRes, missingRes] = await Promise.all([
        fetch('/api/reviews'),
        fetch('/api/departments'),
        fetch('/api/reports/missing'),
      ]);
      const reviews = await reviewsRes.json();
      const depts = await deptsRes.json();
      const missing = await missingRes.json();
      items = reviews.reports ?? [];
      reviewNeeded = items.filter(
        (r: ReviewItem) => r.status === 'SUBMITTED' || r.status === 'CHANGES_REQUIRED',
      ).length;
      submittedCount = items.filter((r: ReviewItem) => r.status === 'SUBMITTED' || r.status === 'APPROVED').length;
      const dept = (depts.departments ?? []).find((d: any) => d.code === 'CSE');
      facultyCount = dept?.member_count ?? 0;
      missingReports = missing.missing ?? [];
      missingPeriod = missing.periodLabel ?? '';
    } catch {
      error = 'Unable to load department data.';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Review workspace · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  {#if loading}<div class="loading-panel">
      <span class="spinner"></span><span>Loading department overview…</span>
    </div>{:else if error}<div class="error-panel">{error}</div>{:else}<div class="breadcrumb">
      Administration <span>/</span> Department overview
    </div>
    <div class="page-heading">
      <div>
        <div class="eyebrow">Review workspace · CSE</div>
        <h1>Department overview</h1>
        <p>Keep the reporting cycle moving.</p>
      </div>
      <span class="period-chip">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
    </div>
    <section class="metrics">
      <div><small>Faculty</small><strong>{facultyCount}</strong><span>in department</span></div>
      <div>
        <small>Submitted</small><strong>{submittedCount}</strong><span
          >{facultyCount ? Math.round((submittedCount / facultyCount) * 100) : 0}% submission rate</span
        >
      </div>
      <div><small>Review needed</small><strong>{reviewNeeded}</strong><span>awaiting your attention</span></div>
    </section>
    <div class="admin-grid">
      <section class="history">
        <div class="section-heading">
          <h2>Needs attention</h2>
          <a href="/admin/reports">Open queue <span>→</span></a>
        </div>
        {#if !items.length}<div class="empty-state">
            No reports requiring attention.
          </div>{:else}{#each items.slice(0, 5) as item}<div class="report-row">
              <span>{item.faculty_name}</span><span
                class="status {item.status === 'SUBMITTED'
                  ? 'submitted'
                  : item.status === 'CHANGES_REQUIRED'
                    ? 'changes'
                    : item.status === 'APPROVED'
                      ? 'approved'
                      : ''}"
                >{item.status === 'CHANGES_REQUIRED'
                  ? 'Changes required'
                  : item.status[0] + item.status.slice(1).toLowerCase()}</span
              ><span>Due {new Date(item.updated_at).toLocaleDateString()}</span><a href="/admin/reports">Review →</a>
            </div>{/each}{/if}
      </section>
      <section class="missing-panel">
        <div class="section-heading">
          <h2>Missing reports</h2>
          <span class="period-badge">{missingPeriod}</span>
        </div>
        {#if !missingReports.length}<div class="empty-state">
            All faculty have submitted for this period.
          </div>{:else}{#each missingReports as m}<div class="missing-row">
              <strong>{m.name}</strong><span>{m.email}</span>
            </div>{/each}
          <p class="missing-note">
            {missingReports.length} faculty {missingReports.length === 1 ? 'has' : 'have'} not yet submitted for {missingPeriod}.
          </p>{/if}
      </section>
    </div>{/if}
</main>

<style>
  .loading-panel {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px;
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
  .error-panel {
    padding: 16px 20px;
    background: #f9e9e7;
    color: #8f413b;
    border-radius: 7px;
    margin-bottom: 18px;
    font-size: 0.88rem;
  }
  .breadcrumb {
    font-size: 0.73rem;
    color: #71818a;
    margin-bottom: 8px;
  }
  .breadcrumb span {
    padding: 0 8px;
    color: #b2bdc1;
  }
  .empty-state {
    padding: 24px 0;
    color: #87969c;
    font-size: 0.82rem;
  }
  .admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-top: 24px;
  }
  .missing-panel {
    background: #fdfcf9;
    border: 1px solid #dbe3e7;
    border-radius: 7px;
    padding: 0 20px;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid #dbe3e7;
  }
  .section-heading h2 {
    font-size: 1rem;
    margin: 0;
  }
  .section-heading a {
    color: #087f73;
    text-decoration: none;
    font-weight: 750;
    font-size: 0.8rem;
  }
  .period-badge {
    font-size: 0.68rem;
    color: #87969c;
    background: #edf3f5;
    padding: 4px 9px;
    border-radius: 99px;
    white-space: nowrap;
  }
  .missing-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #eef3f5;
    font-size: 0.82rem;
  }
  .missing-row strong {
    color: #1b2b36;
  }
  .missing-row span {
    color: #71818a;
  }
  .missing-note {
    color: #87969c;
    font-size: 0.74rem;
    padding: 10px 0;
    margin: 0;
  }
  @media (max-width: 750px) {
    .admin-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
