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
    counts,
    onselect,
  }: {
    weeks: Week[];
    selectedPeriod: string | null;
    weekDetail: PeriodDetail | null;
    currentPeriodId: string | null;
    counts: { awaiting: number; changes: number; approved: number };
    onselect: (periodId: string) => void;
  } = $props();
</script>

<!--
  Same card, header and row vocabulary as the report overview, so the department
  view reads as part of the same page rather than a second design. The week
  calendar carries the status on hover instead of a hint banner.
-->
<section class="card" aria-labelledby="dept-title">
  <div class="panel-head">
    <h2 id="dept-title">Your department</h2>
    <a class="btn btn-primary" href="/admin/reports">Review queue →</a>
  </div>

  <div class="dept-body">
    <WeeksTimeline
      mode="reviewer"
      {weeks}
      {selectedPeriod}
      {weekDetail}
      {currentPeriodId}
      {onselect}
    />

    <dl class="counts">
      <div class="count">
        <dt>Awaiting review</dt>
        <dd>{counts.awaiting}</dd>
      </div>
      <div class="count">
        <dt>Changes requested</dt>
        <dd>{counts.changes}</dd>
      </div>
      <div class="count">
        <dt>Approved</dt>
        <dd>{counts.approved}</dd>
      </div>
    </dl>
  </div>

  <p class="dept-note">
    Hover a week to see what was submitted. Your own report is reviewed by the
    director or dean, so it never appears in this queue.
  </p>
</section>

<style>
  .dept-body { display: grid; grid-template-columns: minmax(0, 1fr) 200px; gap: var(--sp-5); padding: var(--sp-5); align-items: start; }
  .counts { margin: 0; display: grid; gap: var(--sp-3); }
  .count { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-3); }
  .count dt { font-size: var(--fs-sm); color: var(--text-3); }
  .count dd {
    margin: 0; font-size: var(--fs-xl); font-weight: 700; color: var(--text-1);
    font-variant-numeric: tabular-nums;
  }
  .dept-note {
    margin: 0; padding: 0 var(--sp-5) var(--sp-5);
    font-size: var(--fs-sm); color: var(--text-3); line-height: 1.5;
  }
  @media (max-width: 1080px) {
    .dept-body { grid-template-columns: 1fr; }
    .counts { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 620px) {
    .counts { grid-template-columns: 1fr; }
  }
</style>
