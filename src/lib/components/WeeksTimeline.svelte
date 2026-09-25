<script lang="ts">
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { groupWeeksByMonth, weekCellClass, weekTip, weekYears, type WeeksMode, type Week } from '$lib/weeks';

  let {
    mode,
    weeks,
    loading,
    selectedPeriod,
    weekDetail,
    detailLoading,
    currentPeriodId,
    onselect,
  }: {
    mode: WeeksMode;
    weeks: Week[];
    loading: boolean;
    selectedPeriod: string | null;
    weekDetail: PeriodDetail | null;
    detailLoading: boolean;
    currentPeriodId: string | null;
    onselect: (periodId: string) => void;
  } = $props();

  interface PeriodReportSummary {
    status: string;
  }

  interface PeriodDetail {
    report?: { status: string } | null;
    reports?: PeriodReportSummary[];
  }

  let timelineEl = $state<HTMLElement | null>(null);
  let tooltipText = $state('');
  let tooltipVisible = $state(false);
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);

  let selectedYear = $state<number | null>(null);
  const years = $derived(weekYears(weeks));
  const activeYear = $derived(selectedYear ?? years[0] ?? new Date().getFullYear());
  const availableYears = $derived(years.length ? years : [activeYear]);

  function pickYear(year: number) {
    selectedYear = year;
    onselect('');
  }
  const groups = $derived(groupWeeksByMonth(weeks, activeYear));
  const weekCount = $derived(groups.reduce((n, g) => n + g.weeks.length, 0));

  const summary = $derived.by(() => {
    const reports = weekDetail?.reports ?? [];
    if (mode === 'faculty' || !reports.length) return null;
    return {
      approved: reports.filter((r) => r.status === 'APPROVED').length,
      submitted: reports.filter((r) => r.status === 'SUBMITTED').length,
      total: reports.length,
    };
  });

  $effect(() => {
    if (!timelineEl) return;
    queueMicrotask(() => {
      const cell = timelineEl?.querySelector('.week-cell.current');
      if (cell && timelineEl) {
        const rect = cell.getBoundingClientRect();
        const tl = timelineEl.getBoundingClientRect();
        timelineEl.scrollLeft = timelineEl.scrollLeft + (rect.right - tl.right) + 24;
      }
      updateArrows();
    });
  });

  $effect(() => {
    if (!timelineEl) return;
    const onScroll = () => {
      if (!timelineEl) return;
      const max = timelineEl.scrollWidth - timelineEl.clientWidth;
      if (timelineEl.scrollLeft > max) timelineEl.scrollLeft = max;
      updateArrows();
    };
    timelineEl.addEventListener('scroll', onScroll);
    return () => timelineEl?.removeEventListener('scroll', onScroll);
  });

  function updateArrows() {
    if (!timelineEl) return;
    const max = timelineEl.scrollWidth - timelineEl.clientWidth;
    canScrollLeft = timelineEl.scrollLeft > 4;
    canScrollRight = max > 4 && timelineEl.scrollLeft < max - 4;
  }

  function scrollWeeks(direction: number) {
    timelineEl?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }

  function showTip(e: MouseEvent, week: Week) {
    tooltipText = weekTip(mode, week);
    tooltipVisible = true;
    positionTip(e);
  }

  function positionTip(e: MouseEvent) {
    tooltipX = e.clientX;
    tooltipY = e.clientY - 10;
  }

  function hideTip() {
    tooltipVisible = false;
  }
</script>

<section class="weeks-card">
  <div class="panel-head weeks-head">
    <div class="weeks-title">
      <h2>Reporting weeks</h2>
      {#if !loading && weeks.length}
        <span class="weeks-count">{weekCount} week{weekCount === 1 ? '' : 's'} · {activeYear}</span>
      {/if}
    </div>
    {#if availableYears.length > 1}
      <div class="weeks-years">
        {#each availableYears as y}
          <button class="year-pill" class:active={y === activeYear} onclick={() => pickYear(y)}>{y}</button>
        {/each}
      </div>
    {/if}
    <div class="weeks-legend">
      <span class="legend-dot" style="background:var(--line-light)"></span><span>No report</span>
      <span class="legend-dot" style="background:var(--warn-soft)"></span><span>Draft</span>
      <span class="legend-dot" style="background:var(--blue-soft)"></span><span>Submitted</span>
      <span class="legend-dot" style="background:var(--green-soft)"></span><span>Approved</span>
      <span class="legend-dot" style="background:var(--red-soft)"></span><span>Changes</span>
    </div>
  </div>
  {#if loading}
    <div class="weeks-loading"><span class="spinner"></span></div>
  {:else if !weeks.length}
    <div class="weeks-empty">No reporting weeks yet. Ask your HOD or admin to open a reporting period.</div>
  {:else}
    <div class="weeks-body">
      <div class="weeks-timeline-row">
        <button class="scroll-arrow scroll-left" class:hidden={!canScrollLeft} onclick={() => scrollWeeks(-1)} aria-label="Scroll earlier">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="weeks-timeline" bind:this={timelineEl} aria-label={`Reporting weeks for ${activeYear}`}>
          {#if weekCount > 1}<span class="weeks-empty-label">New Semester Begins</span>{/if}
          {#each groups as group}
            <div class="week-month">
              <span class="week-month-label">{group.label}</span>
              <div class="week-strip">
                {#each group.weeks as week}
                  <button
                    class="week-cell {weekCellClass(mode, week)}"
                    class:current={week.id === currentPeriodId}
                    class:sel={week.id === selectedPeriod}
                    class:late={Number(week.late) === 1}
                    aria-label={weekTip(mode, week)}
                    onclick={() => onselect(week.id)}
                    onmouseenter={(e) => showTip(e, week)}
                    onmousemove={positionTip}
                    onmouseleave={hideTip}
                  >
                    <span>{new Date(week.starts_on + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
        <button class="scroll-arrow scroll-right" class:hidden={!canScrollRight} onclick={() => scrollWeeks(1)} aria-label="Scroll forward">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      {#if detailLoading}
        <span class="spinner"></span>
      {:else if weekDetail}
        <div class="selected-status">
          {#if weekDetail.report}
            <StatusPill status={weekDetail.report.status} />
          {:else}
            <span class="wp-none">Not started</span>
          {/if}
        </div>
      {/if}
    </div>
    {#if summary}
      <div class="weeks-reports-summary">
        <span>{summary.approved}/{summary.total} approved · {summary.submitted} pending review</span>
        <a href="/admin/reports">View all →</a>
      </div>
    {/if}
  {/if}
</section>

{#if tooltipVisible}
  <div class="week-tooltip" style="left:{tooltipX}px;top:{tooltipY}px">{tooltipText}</div>
{/if}

<style>
  .weeks-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); min-width: 0; overflow: hidden; box-shadow: var(--shadow-sm); }
  .weeks-head { display: flex; justify-content: space-between; align-items: center; padding: 17px 22px; border-bottom: 1px solid var(--line); background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent); gap: 14px; flex-wrap: wrap; overflow: hidden; border-radius: 8px 8px 0 0; }
  .weeks-title { display: flex; align-items: baseline; gap: 9px; min-width: 0; }
  .weeks-title h2 { white-space: nowrap; }
  .weeks-count { font-size: 0.68rem; font-weight: 600; color: var(--muted-2); white-space: nowrap; }
  .weeks-years { display: flex; align-items: center; gap: 2px; padding: 2px; background: #eef1f2; border: 1px solid var(--line); border-radius: 7px; flex: none; }
  .year-pill { border: 0; background: transparent; font: inherit; font-size: 0.7rem; font-weight: 700; color: var(--muted); cursor: pointer; padding: 3px 11px; border-radius: 5px; transition: background 0.12s ease, color 0.12s ease; }
  .year-pill:hover { color: var(--navy); }
  .year-pill.active { background: var(--navy); color: var(--paper); }
  .weeks-legend { display: flex; align-items: center; gap: 4px 10px; font-size: 0.62rem; color: var(--muted-2); margin-left: auto; white-space: nowrap; }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; flex: none; border: 1px solid var(--line); }
  .weeks-loading, .weeks-empty { padding: 28px 20px; display: flex; align-items: center; gap: 12px; color: var(--muted-2); font-size: 0.8rem; justify-content: center; }
  .weeks-body { padding: 18px 24px 22px; background: #fbfcfb; min-width: 0; display: flex; flex-direction: column; }
  .weeks-timeline-row { display: flex; align-items: center; gap: 6px; position: relative; }
  .scroll-arrow { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid var(--line); border-radius: 50%; background: var(--panel); color: var(--muted); cursor: pointer; flex: none; transition: opacity 0.15s ease, background 0.12s ease, color 0.12s ease, border-color 0.12s ease; }
  .scroll-arrow.hidden { opacity: 0; pointer-events: none; }
  .scroll-arrow:hover { background: var(--navy); color: var(--paper); border-color: var(--navy); }
  .weeks-timeline { display: flex; align-items: flex-end; gap: 32px; flex: 1; min-width: 0; overflow-x: auto; padding: 6px 4px 8px; scrollbar-width: thin; scroll-behavior: auto; justify-content: flex-end; }
  .weeks-empty-label { color: var(--muted-3); font-size: 0.95rem; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; align-self: flex-end; margin-bottom: 8px; margin-right: 32px; }
  .week-month { display: grid; gap: 10px; flex: none; }
  .week-month-label { color: var(--muted-2); font-size: 0.64rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .week-strip { display: flex; gap: 10px; }
  .week-cell { width: 44px; height: 44px; border: 1px solid var(--line); border-radius: 10px; padding: 0; cursor: pointer; position: relative; color: var(--muted); font: inherit; font-size: 0.78rem; font-weight: 800; box-shadow: var(--shadow-xs); transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease; }
  .week-cell:hover { transform: translateY(-2px); border-color: var(--blue-border); box-shadow: var(--shadow-sm); z-index: 2; }
  .week-cell.c-none { background: #eef2f6; color: var(--gray); }
  .week-cell.c-draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .week-cell.c-submitted { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .week-cell.c-approved { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .week-cell.c-changes { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .week-cell.late { border-color: var(--red); }
  .week-cell.current { box-shadow: 0 0 0 2px var(--blue); }
  .week-cell.sel { border-color: var(--navy); box-shadow: 0 0 0 2px var(--navy); }
  .week-cell.sel.current { box-shadow: 0 0 0 2px var(--navy); }
  .selected-status { display: flex; align-items: center; gap: 8px; padding-top: 12px; margin-left: auto; }
  .weeks-reports-summary { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid #eef2f3; font-size: 0.74rem; color: var(--muted); }
  .weeks-reports-summary a { color: var(--blue); text-decoration: none; font-weight: 700; font-size: 0.73rem; }
  .week-tooltip {
    position: fixed;
    transform: translate(-50%, -100%);
    background: var(--navy);
    color: var(--paper);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
    padding: 6px 10px;
    border-radius: 6px;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  @media (max-width: 600px) {
    .weeks-timeline-row { flex-direction: column; align-items: stretch; gap: 10px; }
    .selected-status { justify-content: flex-end; }
  }
</style>
