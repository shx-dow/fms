<script lang="ts">
  import WeeksTimeline from '$lib/components/WeeksTimeline.svelte';
  import type { Week } from '$lib/weeks';

  interface PeriodDetail {
    report?: { status: string } | null;
    reports?: { status: string }[];
  }

  let {
    weeks,
    selectedPeriod,
    weekDetail,
    currentPeriodId,
    onselect,
  }: {
    weeks: Week[];
    selectedPeriod: string | null;
    weekDetail: PeriodDetail | null;
    currentPeriodId: string | null;
    onselect: (periodId: string) => void;
  } = $props();

  const reports = $derived(weekDetail?.reports ?? []);
  const awaiting = $derived(reports.filter((r) => r.status === 'SUBMITTED').length);
  const changes = $derived(reports.filter((r) => r.status === 'CHANGES_REQUIRED').length);
  const approved = $derived(reports.filter((r) => r.status === 'APPROVED').length);
</script>

<!-- The department view keeps the same card language as the report overview, and
     leans on the week calendar's hover status instead of hint banners. -->
<section class="dept-section" aria-label="Department review">
  <div class="panel-head">
    <h2>Your department</h2>
    <a href="/admin/reports" class="btn btn-primary">Review queue →</a>
  </div>

  <div class="dept-grid">
    <WeeksTimeline
      mode="reviewer"
      {weeks}
      {selectedPeriod}
      {weekDetail}
      {currentPeriodId}
      {onselect}
    />

    <div class="dept-counts">
      <div class="count-row">
        <span class="count-value">{awaiting}</span>
        <span class="count-label">awaiting review</span>
      </div>
      <div class="count-row">
        <span class="count-value">{changes}</span>
        <span class="count-label">changes requested</span>
      </div>
      <div class="count-row">
        <span class="count-value">{approved}</span>
        <span class="count-label">approved</span>
      </div>
      <a href="/admin/reports" class="reports-viewall">Open review queue →</a>
    </div>
  </div>

  <p class="dept-note">
    Hover a week to see what was submitted. Your own report is reviewed by the
    director or dean, so it never appears in this queue.
  </p>
</section>

<style>
  .dept-section { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
  .dept-grid { display: grid; grid-template-columns: 1fr 220px; gap: 20px; padding: 18px 22px 20px; align-items: start; }
  .dept-counts { border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; background: var(--panel); }
  .count-row { display: flex; align-items: baseline; gap: 10px; padding: 13px 16px; border-bottom: 1px solid var(--line-2); }
  .count-value { font-size: 1.05rem; font-weight: 800; color: var(--navy); min-width: 30px; }
  .count-label { font-size: 0.78rem; color: var(--text-3); }
  .reports-viewall { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--blue); text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .reports-viewall:hover { background: var(--paper); }
  .dept-note { margin: 0; padding: 0 22px 18px; color: var(--muted-2); font-size: 0.76rem; line-height: 1.5; }
  @media (max-width: 900px) {
    .dept-grid { grid-template-columns: 1fr; }
  }
</style>
