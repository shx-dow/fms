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
  One card, one job: show what the department still owes this week and link to
  the queue. The counts and the calendar used to restate the same three states
  side by side, so the panel read as duplicated. The legend now belongs to the
  calendar only, and the counts answer a different question.
-->
<section class="card" aria-labelledby="dept-title">
  <div class="panel-head">
    <h2 id="dept-title">Your department</h2>
    <a class="btn btn-primary" href="/admin/reports">Review queue →</a>
  </div>

  <div class="dept-body">
    <div class="dept-counts">
      <a class="count count-pending" class:quiet={!counts.awaiting} href="/admin/reports?status=SUBMITTED">
        <dt>Awaiting review</dt>
        <dd>{counts.awaiting}</dd>
      </a>
      <a class="count count-changes" class:quiet={!counts.changes} href="/admin/reports?status=CHANGES_REQUIRED">
        <dt>Changes requested</dt>
        <dd>{counts.changes}</dd>
      </a>
      <a class="count count-approved" class:quiet={!counts.approved} href="/admin/reports?status=APPROVED">
        <dt>Approved</dt>
        <dd>{counts.approved}</dd>
      </a>
    </div>

    <div class="dept-cal">
      <WeeksTimeline
        mode="reviewer"
        {weeks}
        {selectedPeriod}
        {weekDetail}
        {currentPeriodId}
        {onselect}
      />
    </div>
  </div>
</section>

<style>
  .dept-body { display: grid; gap: var(--sp-5); padding: var(--sp-5); }
  /* Three counters lead: they are what the HOD acts on. */
  .dept-counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
  .count {
    display: flex; flex-direction: column; gap: 2px; text-decoration: none;
    padding: var(--sp-4); border: 1px solid var(--line); border-radius: var(--radius-md);
    background: var(--paper); transition: border-color 0.12s ease, background 0.12s ease;
  }
  .count:hover { border-color: var(--muted-3); background: var(--bg-hover); }
  /* A zero is not a call to action, so it steps back instead of shouting. */
  .count.quiet { opacity: 0.55; }
  .count dt { font-size: var(--fs-sm); color: var(--text-3); }
  .count dd {
    margin: 0; font-size: var(--fs-2xl); font-weight: 700; color: var(--text-1);
    font-variant-numeric: tabular-nums;
  }
  .count-pending dd { color: var(--blue); }
  .count-changes dd { color: var(--red); }
  .count-approved dd { color: var(--green); }
  @media (max-width: 620px) {
    .dept-counts { grid-template-columns: 1fr; }
  }
</style>
