<script lang="ts">
  import type { ReportWithFaculty } from '$lib/server/db/repositories/reports';
  import type { TeachingDbRow, ResearchDbRow, DutyDbRow, OutreachDbRow } from '$lib/server/db/repositories/activity';
  import type { ReviewRow } from '$lib/server/db/repositories/reviews';
  let {
    data,
  }: {
    data: {
      report: ReportWithFaculty & { period_label?: string };
      teaching: TeachingDbRow[];
      research: ResearchDbRow[];
      duties: DutyDbRow[];
      outreach: OutreachDbRow[];
      reviews: ReviewRow[];
    };
  } = $props();
  const r = $derived(data.report);
  const statusLabel = $derived(
    r.status === 'APPROVED' ? 'Approved' : r.status === 'SUBMITTED' ? 'Submitted' : r.status === 'CHANGES_REQUIRED' ? 'Changes requested' : 'Draft',
  );
</script>

<svelte:head><title>Report {r.period_label} · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <header class="viewer-head">
    <div>
      <h1>Report</h1>
      <span class="head-period">{r.period_label}</span>
      <span class="status-pill">{statusLabel} · {r.completion ?? 0}%</span>
    </div>
    <div class="viewer-actions">
      <a class="act-link" href="/reports">← All reports</a>
      <a class="act-link" href="/reports/current">Current report →</a>
      <a class="act-link" href="/api/reports/{r.id}/pdf" target="_blank">PDF</a>
      <a class="act-link" href="/api/reports/current/export?reportId={r.id}">CSV</a>
      <a class="act-link" href="/reports/current/print?id={r.id}" target="_blank">Print</a>
    </div>
  </header>

  <div class="preview-paper">
    <div class="preview-kicker">Faculty weekly report · {r.period_label}</div>
    <h2>Teaching & academic delivery</h2>
    {#each data.teaching as item}
      <div class="preview-row">
        <strong>{item.course_code || 'Untitled'}</strong>
        <span>{item.course_name || 'Course name pending'}</span>
        <span class="preview-stat">{item.conducted} / {item.scheduled} classes · up to lecture {item.syllabus_lecture ?? '—'}</span>
      </div>
    {:else}
      <p class="empty">No teaching records.</p>
    {/each}
    <h2>Research & publications</h2>
    {#each data.research as item}
      <div class="preview-row">
        <strong>{item.title || 'Untitled'}</strong>
        <span>{item.category}</span>
        <span class="preview-stat">{item.status || '—'}{item.venue_or_agency ? ` · ${item.venue_or_agency}` : ''}</span>
      </div>
    {:else}
      <p class="empty">No research records.</p>
    {/each}
    <h2>Institutional duties</h2>
    {#each data.duties as item}
      <div class="preview-row">
        <strong>{item.name || 'Untitled'}</strong>
        <span>{item.role || '—'}</span>
        <span class="preview-stat">{item.activity || '—'}</span>
      </div>
    {:else}
      <p class="empty">No duties recorded.</p>
    {/each}
    <h2>Outreach & admissions</h2>
    {#each data.outreach as item}
      <div class="preview-row">
        <strong>{item.activity || 'Untitled'}</strong>
        <span>{item.audience || '—'}</span>
        <span class="preview-stat">{item.date || '—'}</span>
      </div>
    {:else}
      <p class="empty">No outreach recorded.</p>
    {/each}
    {#if r.summary}
      <h2>Weekly summary</h2>
      <div class="preview-text">{r.summary}</div>
    {/if}
  </div>

  {#if data.reviews.length}
    <details class="review-box" open>
      <summary>Review history ({data.reviews.length})</summary>
      {#each data.reviews as rv}
        <div class="review-row">
          <strong>{rv.reviewer_name}</strong>
          <span class="review-date">{rv.decision} · {new Date(rv.created_at).toLocaleString()}</span>
          {#if rv.remarks}<p>{rv.remarks}</p>{/if}
        </div>
      {/each}
    </details>
  {/if}
</main>

<style>
  .shell { max-width: 1100px; }
  .viewer-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 20px 24px; box-shadow: var(--shadow-sm); }
  .viewer-head h1 { font-size: 1.5rem; margin: 0; display: inline; margin-right: 10px; letter-spacing: -0.03em; font-weight: 750; color: var(--text-1); }
  .head-period { font-size: 0.84rem; color: var(--text-3); margin-right: 10px; }
  .status-pill { font-size: 0.7rem; font-weight: 800; padding: 4px 11px; border-radius: 999px; background: var(--bg-hover); border: 1px solid var(--line); color: var(--muted); }
  .viewer-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .act-link { border: 1px solid var(--line); border-radius: 7px; padding: 8px 13px; background: var(--panel); color: var(--accent-strong); font-size: 0.76rem; font-weight: 700; text-decoration: none; box-shadow: var(--shadow-xs); transition: all 0.12s; }
  .act-link:hover { background: var(--bg-hover); border-color: var(--blue-border); box-shadow: var(--shadow-sm); }
  .preview-paper { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 34px 36px; box-shadow: var(--shadow-sm); }
  .preview-kicker { font-size: 0.7rem; font-weight: 800; color: var(--accent); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid var(--line-2); }
  .preview-paper h2 { font-size: 1.02rem; margin: 22px 0 10px; letter-spacing: -0.01em; font-weight: 750; color: var(--text-1); }
  .preview-row { display: grid; grid-template-columns: 150px 1fr auto; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line-2); font-size: 0.84rem; align-items: center; }
  .preview-stat { color: var(--muted); }
  .preview-text { background: var(--paper); border-radius: 6px; padding: 14px; font-size: 0.82rem; line-height: 1.5; white-space: pre-wrap; }
  .empty { color: var(--muted-2); font-size: 0.8rem; }
  .review-box { margin-top: 20px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px; }
  .review-box summary { cursor: pointer; font-size: 0.78rem; font-weight: 700; }
  .review-row { padding: 10px 0; border-bottom: 1px solid var(--line-2); font-size: 0.8rem; }
  .review-date { display: block; font-size: 0.68rem; color: var(--muted-2); }
</style>
