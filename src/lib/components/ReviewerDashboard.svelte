<script lang="ts">
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import WeeksTimeline from '$lib/components/WeeksTimeline.svelte';
  import type { Week } from '$lib/weeks';

  interface PeriodDetail {
    report?: { status: string } | null;
    reports?: { status: string }[];
  }

  let {
    name,
    weeks,
    loading,
    selectedPeriod,
    weekDetail,
    detailLoading,
    currentPeriodId,
    onselect,
  }: {
    name: string | undefined;
    weeks: Week[];
    loading: boolean;
    selectedPeriod: string | null;
    weekDetail: PeriodDetail | null;
    detailLoading: boolean;
    currentPeriodId: string | null;
    onselect: (periodId: string) => void;
  } = $props();

  function greeting(): string {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    return name ? `Good ${part}, ${name}` : 'Dashboard';
  }
</script>

<PageHeader title={greeting()}>
  {#snippet actions()}
    <NotificationBell />
    <a href="/admin/reports" class="btn btn-primary">Review queue →</a>
  {/snippet}
</PageHeader>

<div class="dash-row">
  <WeeksTimeline
    mode="reviewer"
    {weeks}
    {loading}
    {selectedPeriod}
    {weekDetail}
    {detailLoading}
    {currentPeriodId}
    {onselect}
  />

  <div class="attention-card">
    <div class="panel-head">
      <h2>Review</h2>
    </div>
    <div class="attn-row">
      <span class="attn-icon info">i</span>
      <div>
        <strong>Reports awaiting review</strong>
        <p>Review submitted reports from your department and approve or request changes.</p>
      </div>
    </div>
    <a href="/admin/reports" class="attn-action">Open review queue →</a>
  </div>
</div>

<section class="reports-panel">
  <div class="panel-head">
    <h2>Review queue</h2>
  </div>
  <div class="hist-empty">Submitted reports from your department appear in the review queue.</div>
  <a href="/admin/reports" class="reports-viewall">Open review queue →</a>
</section>

<style>
  .dash-row { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: start; margin-bottom: 24px; }
  .attention-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; align-self: stretch; display: flex; flex-direction: column; box-shadow: var(--shadow-sm); border-top: 3px solid var(--accent); }
  .attention-card .attn-row { flex: 1; }
  .attn-row { display: flex; gap: 12px; padding: 18px 20px; align-items: flex-start; }
  .attn-row strong { display: block; font-size: 0.84rem; color: var(--text-1); margin-bottom: 4px; }
  .attn-row p { margin: 0; font-size: 0.78rem; color: var(--text-3); line-height: 1.5; }
  .attn-icon { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 0.7rem; font-weight: 800; flex: none; }
  .attn-icon.info { background: var(--blue-soft); color: var(--blue-dark); }
  .attn-action { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--blue); text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .reports-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
  .reports-viewall { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--blue); text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .reports-viewall:hover { background: var(--paper); }
  .hist-empty { padding: 24px 18px; text-align: center; color: var(--muted-2); font-size: 0.8rem; }
</style>
