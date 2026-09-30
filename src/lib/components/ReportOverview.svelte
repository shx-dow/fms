<script lang="ts">
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import {
    groupWeeksByMonth,
    weekCellClass,
    weekStatusLabel,
    weekYears,
    type Week,
  } from '$lib/weeks';
  import type { DashboardReportData } from '$lib/dashboard-types';


  let { name, report, weeks: initialWeeks }: {
    name: string;
    report: DashboardReportData | null;
    weeks: Week[];
  } = $props();

  const completion = $derived(report?.completion ?? 0);
  const scheduled = $derived(report?.scheduled ?? 0);
  const conducted = $derived(report?.conducted ?? 0);
  const periodLabel = $derived(report?.periodLabel ?? 'Current reporting period');
  const status = $derived(report?.status ?? 'No report');
  const dueDate = $derived(report?.dueOn ?? '');
  const history = $derived(report?.history ?? []);
  const reportId = $derived(report?.reportId ?? '');
  const researchCount = $derived(report?.researchCount ?? 0);
  const dutiesCount = $derived(report?.dutiesCount ?? 0);
  const outreachCount = $derived(report?.outreachCount ?? 0);
  const filesCount = $derived(report?.filesCount ?? 0);
  const teachingDone = $derived(report?.hasTeaching ?? false);

  const deadline = $derived(
    dueDate
      ? new Date(dueDate).toLocaleString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
        })
      : '',
  );
  const deadlineMs = $derived(dueDate ? new Date(dueDate).getTime() - Date.now() : 0);
  const deadlineHours = $derived(Math.round(deadlineMs / 3600000));
  const pending = $derived(status === 'Draft' || status === 'No report' || status === 'Changes required');
  const deadlineUrgent = $derived(deadlineMs > 0 && deadlineHours < 24 && pending);
  const deadlinePassed = $derived(deadlineMs < 0 && pending);
  const deadlineNote = $derived(
    deadlinePassed
      ? 'Deadline passed'
      : deadlineUrgent
        ? `${deadlineHours}h left to submit`
        : `Due ${deadline}`,
  );

  const ctaLabel = $derived(
    status === 'Approved' ? 'View report' : status === 'Submitted' ? 'View submitted' : status === 'No report' ? 'Start first report' : 'Continue report',
  );

  // Five sections were five rows of vertical space. They read as a single line
  // of counts, and each count still links to its step.
  const chips = $derived([
    { label: 'Teaching', value: teachingDone ? `${conducted}/${scheduled}` : 'not started', step: 'teaching', done: teachingDone },
    { label: 'Research', value: researchCount ? String(researchCount) : 'not started', step: 'research', done: researchCount > 0 },
    { label: 'Duties', value: dutiesCount ? String(dutiesCount) : 'not started', step: 'duties', done: dutiesCount > 0 },
    { label: 'Outreach', value: outreachCount ? String(outreachCount) : 'not started', step: 'outreach', done: outreachCount > 0 },
    { label: 'Files', value: filesCount ? String(filesCount) : 'not started', step: 'files', done: filesCount > 0 },
  ]);
  const doneCount = $derived(chips.filter((c) => c.done).length);

  const ringC = 163.36;
  const ringOff = $derived(ringC * (1 - Math.min(100, Math.max(0, completion)) / 100));

  const weeks = $derived(initialWeeks);
  const currentPeriodId = $derived(weeks.find((w) => Number(w.is_open) === 1)?.id ?? null);
  const graphYear = $derived(weekYears(weeks)[0] ?? new Date().getFullYear());
  const weekGroups = $derived(groupWeeksByMonth(weeks, graphYear));

  function graphTip(w: Week) {
    const base = `${w.week_label} · ${weekStatusLabel(w.status)}`;
    if (w.status === 'DRAFT' && Number(w.completion)) return `${base} · ${w.completion}%`;
    return base;
  }

</script>

<!--
  One dominant object, then two supporting ones. The greeting does not earn a
  full band of its own; it sits in the page header with the notification bell,
  where the eye lands first anyway.
-->
<div class="ov-head">
  <div>
    <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {name}</h1>
    <p class="ov-sub">{periodLabel}</p>
  </div>
  <div class="ov-head-acts">
    <NotificationBell />
    <a href="/reports/current?step=teaching" class="btn btn-primary">{ctaLabel} →</a>
  </div>
</div>

<div class="ov-grid">
  <!-- Primary: this week, and the single answer to "what do I do". -->
  <section class="card now" aria-labelledby="now-title">
    <div class="panel-head">
      <h2 id="now-title">This week</h2>
      <StatusPill status={status === 'No report' ? 'DRAFT' : status} />
    </div>
    <div class="now-body">
      <div class="now-top">
        <div
          class="ring"
          class:done={completion >= 100}
          role="img"
          aria-label={`Report ${completion}% complete`}
        >
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle class="ring-bg" cx="32" cy="32" r="26" />
            <circle class="ring-fg" cx="32" cy="32" r="26" stroke-dasharray={ringC} stroke-dashoffset={ringOff} />
          </svg>
          <strong>{completion}%</strong>
        </div>
        <div class="now-facts">
          <p class="now-deadline" class:urgent={deadlineUrgent} class:passed={deadlinePassed}>{deadlineNote}</p>
          <p class="now-progress">{doneCount} of {chips.length} sections filled in</p>
        </div>
      </div>

      <ul class="chips">
        {#each chips as c}
          <li>
            <a href="/reports/current?step={c.step}" class:done={c.done}>
              <span class="chip-label">{c.label}</span>
              <span class="chip-value">{c.value}</span>
            </a>
          </li>
        {/each}
      </ul>

      <div class="now-acts">
        <a href="/reports/current?step=teaching" class="btn btn-primary">{ctaLabel}</a>
        <a href="/api/reports/{reportId}/pdf" class="btn" target="_blank" rel="noopener">PDF</a>
      </div>
    </div>
  </section>

  <!-- Supporting: the year, and what has been filed. -->
  <div class="side-col">
    <section class="card" aria-labelledby="prog-title">
      <div class="panel-head">
        <h2 id="prog-title">Your weeks</h2>
        <a href="/reports">All reports →</a>
      </div>
      {#if weeks.length}
        <div class="graph-body">
          {#each weekGroups as group}
            <div class="graph-month">
              <span class="graph-month-label">{group.label}</span>
              <div class="graph-cells">
                {#each group.weeks as week}
                  {@const rid = history.find((h) => h.period_id === week.id)?.id}
                  {@const gcls = weekCellClass('faculty', week)}
                  {#if week.id === currentPeriodId}
                    <a
                      class="cell {gcls} current"
                      href="/reports/current?step=teaching"
                      title={graphTip(week)}
                      aria-label={graphTip(week)}
                    ></a>
                  {:else if rid}
                    <a class="cell {gcls}" href="/reports/{rid}" title={graphTip(week)} aria-label={graphTip(week)}></a>
                  {:else}
                    <span class="cell {gcls}" title={graphTip(week)}></span>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        </div>
        <div class="legend">
          <span class="lg"><i class="c-none"></i>None</span>
          <span class="lg"><i class="c-draft"></i>Draft</span>
          <span class="lg"><i class="c-submitted"></i>Submitted</span>
          <span class="lg"><i class="c-approved"></i>Approved</span>
          <span class="lg"><i class="c-changes"></i>Changes</span>
        </div>
      {:else}
        <p class="empty">No reporting weeks yet. Ask your HOD or admin to open a period.</p>
      {/if}
    </section>

    <section class="card" aria-labelledby="hist-title">
      <div class="panel-head"><h2 id="hist-title">Recent reports</h2></div>
      {#if history.length}
        {#each history.slice(0, 4) as r}
          <a class="row" href="/reports/{r.id}">
            <span><b>{r.period_label}</b><small>Updated {new Date(r.updated_at).toLocaleDateString()}</small></span>
            <span class="row-meta"><StatusPill status={r.status} /></span>
          </a>
        {/each}
        <a class="row row-all" href="/reports">View all reports →</a>
      {:else}
        <p class="empty">Your filed reports will appear here.</p>
      {/if}
    </section>
  </div>
</div>

<style>
  .ov-head {
    display: flex; align-items: flex-start; gap: var(--sp-5); flex-wrap: wrap;
    margin-bottom: var(--sp-5);
  }
  .ov-head h1 { margin: 0; font-size: var(--fs-3xl); letter-spacing: -0.03em; font-weight: 700; color: var(--text-1); }
  .ov-sub { margin: 2px 0 0; font-size: var(--fs-md); color: var(--text-3); }
  .ov-head-acts { margin-left: auto; display: flex; align-items: center; gap: var(--sp-3); }

  /* One dominant column, one supporting. Stacks on narrow screens. */
  .ov-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr); gap: var(--sp-4); align-items: start; }
  .side-col { display: grid; gap: var(--sp-4); align-content: start; }

  .now-body { padding: var(--sp-5); display: grid; gap: var(--sp-5); }
  .now-top { display: flex; align-items: center; gap: var(--sp-6); }
  .now-facts { min-width: 0; }
  .now-deadline { margin: 0; font-size: var(--fs-lg); font-weight: 650; color: var(--text-1); }
  .now-deadline.urgent { color: var(--warn-dark); }
  .now-deadline.passed { color: var(--red); }
  .now-progress { margin: 3px 0 0; font-size: var(--fs-md); color: var(--text-3); }

  .ring { position: relative; width: 64px; height: 64px; flex: none; }
  .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring circle { fill: none; stroke-width: 7; }
  .ring .ring-bg { stroke: var(--line-2); }
  .ring .ring-fg { stroke: var(--blue); transition: stroke-dashoffset 0.4s ease; }
  .ring.done .ring-fg { stroke: var(--green); }
  .ring strong { position: absolute; inset: 0; display: grid; place-items: center; font-size: var(--fs-base); font-weight: 700; color: var(--text-1); }

  /* The five sections as one line of counts, each still a link. */
  .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2); }
  .chips a {
    display: inline-flex; align-items: baseline; gap: 6px;
    padding: 5px 10px; border-radius: 999px;
    border: 1px solid var(--line); background: var(--paper);
    text-decoration: none; color: var(--text-2);
    transition: border-color 0.12s ease, background 0.12s ease;
  }
  .chips a:hover { border-color: var(--muted-3); background: var(--bg-hover); }
  .chips a.done { border-color: var(--success-border); background: var(--success-bg); }
  .chip-label { font-size: var(--fs-sm); font-weight: 600; color: var(--text-2); }
  .chip-value { font-size: var(--fs-sm); font-weight: 700; color: var(--text-1); }
  .chips a.done .chip-label { color: var(--green); }

  .now-acts { display: flex; gap: var(--sp-3); flex-wrap: wrap; }

  .graph-body { padding: var(--sp-4) var(--sp-4) var(--sp-3); display: grid; gap: var(--sp-4); }
  .graph-month { display: grid; gap: 6px; }
  .graph-month-label {
    color: var(--text-3); font-size: var(--fs-xs); font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .graph-cells { display: flex; flex-wrap: wrap; gap: 5px; }
  .cell {
    width: 18px; height: 18px; border-radius: 5px; border: 1px solid var(--line-2);
    display: block; transition: transform 0.12s ease;
  }
  .cell:hover { transform: scale(1.15); }
  .cell.current { box-shadow: 0 0 0 2px var(--panel), 0 0 0 3px var(--blue); }
  .c-none { background: var(--line-light); }
  .c-draft { background: var(--draft-bg); border-color: var(--draft-border); }
  .c-submitted { background: var(--info-bg); border-color: var(--blue-border); }
  .c-approved { background: var(--success-bg); border-color: var(--success-border); }
  .c-changes { background: var(--red-bg); border-color: var(--red-border); }

  .legend {
    display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 0 var(--sp-4) var(--sp-4);
    font-size: var(--fs-xs); color: var(--text-3);
  }
  .lg { display: inline-flex; align-items: center; gap: 5px; }
  .lg i { width: 9px; height: 9px; border-radius: 3px; border: 1px solid var(--line-2); }
  .lg .c-none { background: var(--line-light); }
  .lg .c-draft { background: var(--draft-bg); border-color: var(--draft-border); }
  .lg .c-submitted { background: var(--info-bg); border-color: var(--blue-border); }
  .lg .c-approved { background: var(--success-bg); border-color: var(--success-border); }
  .lg .c-changes { background: var(--red-bg); border-color: var(--red-border); }

  .row-all { justify-content: center; font-size: var(--fs-sm); font-weight: 600; color: var(--blue); }

  @media (max-width: 1080px) {
    .ov-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 620px) {
    .now-top { gap: var(--sp-4); }
    .ov-head-acts { margin-left: 0; width: 100%; }
  }
</style>
