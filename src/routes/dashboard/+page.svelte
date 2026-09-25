<script lang="ts">
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import ReviewerDashboard from '$lib/components/ReviewerDashboard.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import {
    groupWeeksByMonth,
    weekCellClass,
    weekStatusLabel,
    weekYears,
    type Week,
  } from '$lib/weeks';

  interface WeekDetail {
    report?: { status: string } | null;
    reports?: { status: string }[];
  }

  let { data } = $props();
  const user = $derived(data.user);
  function greetingName(name: string | undefined) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    const title = /^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?$/i.test(parts[0]) ? parts.shift() : '';
    const firstName = parts[0] ?? '';
    return title ? `${title} ${firstName}` : firstName;
  }
  const isFaculty = $derived(user?.role === 'FACULTY');
  const report = $derived(data.report);
  const completion = $derived(report?.completion ?? 0);
  const scheduled = $derived(report?.scheduled ?? 0);
  const conducted = $derived(report?.conducted ?? 0);
  const syllabus = $derived(report?.syllabus ?? 0);
  const periodLabel = $derived(report?.periodLabel ?? '');
  const status = $derived(report?.status ?? 'No report');
  const dueDate = $derived(report?.dueOn ?? '');
  const history = $derived(report?.history ?? []);
  const reportId = $derived(report?.reportId ?? '');
  const researchCount = $derived(report?.researchCount ?? 0);
  const dutiesCount = $derived(report?.dutiesCount ?? 0);
  const outreachCount = $derived(report?.outreachCount ?? 0);
  const filesCount = $derived(report?.filesCount ?? 0);
  const deadline = $derived(dueDate ? new Date(dueDate).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  const deliveryRate = $derived(scheduled ? Math.round((conducted / scheduled) * 100) : null);
  const deadlineMs = $derived(dueDate ? new Date(dueDate).getTime() - Date.now() : 0);
  const deadlineHours = $derived(Math.round(deadlineMs / 3600000));
  const deadlineUrgent = $derived(deadlineMs > 0 && deadlineHours < 24 && (status === 'Draft' || status === 'No report' || status === 'Changes required'));
  const deadlinePassed = $derived(deadlineMs < 0 && (status === 'Draft' || status === 'No report' || status === 'Changes required'));
  const ctaLabel = $derived(
    status === 'Approved' ? 'View report' : status === 'Submitted' ? 'View submitted' : status === 'No report' ? 'Start first report' : 'Continue report',
  );
  const heroDeadline = $derived(
    deadlinePassed ? 'Deadline passed' : deadlineUrgent ? `${deadlineHours}h left to submit` : deadline ? `Due ${deadline}` : '',
  );
  const ringC = 163.36;
  const ringOff = $derived(ringC * (1 - Math.min(100, Math.max(0, completion)) / 100));
  const teachingDone = $derived(report?.hasTeaching ?? false);

  // Weeks arrive with the page; selecting one still fetches its detail.
  const initialWeeks = (): Week[] => data.weeks;
  let weeks = $state<Week[]>([]);
  let selectedPeriod = $state<string | null>(null);
  let weekDetail = $state<WeekDetail | null>(null);
  let detailLoading = $state(false);
  const currentPeriodId = $derived(weeks.find((w) => Number(w.is_open) === 1)?.id ?? null);

  const graphYear = $derived(weekYears(weeks)[0] ?? new Date().getFullYear());
  const weekGroups = $derived(groupWeeksByMonth(weeks, graphYear));

  function graphTip(w: Week) {
    const base = `${w.week_label} · ${weekStatusLabel(w.status)}`;
    if (w.status === 'DRAFT' && Number(w.completion)) return `${base} · ${w.completion}%`;
    return base;
  }

  async function selectWeek(id: string) {
    selectedPeriod = id || null;
    detailLoading = false;
    weekDetail = null;
    if (!id) return;
    detailLoading = true;
    try {
      const res = await fetch(`/api/dashboard/weeks?period=${id}`);
      weekDetail = await res.json();
    } finally { detailLoading = false; }
  }

  $effect.pre(() => {
    if (weeks.length) return;
    weeks = initialWeeks();
    if (currentPeriodId) selectWeek(currentPeriodId);
  });
</script>

<svelte:head><title>Dashboard · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  {#if isFaculty}
      <section class="hero">
        <div class="hero-main">
          <span class="hero-eyebrow">{periodLabel || 'Current reporting period'}</span>
          <h1>{user?.name ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${greetingName(user.name)}` : 'Dashboard'}</h1>
          {#if heroDeadline}
            <p class="hero-deadline" class:urgent={deadlineUrgent} class:passed={deadlinePassed}>{heroDeadline}</p>
          {/if}
        </div>
        <div class="hero-side">
          <div class="ring" class:done={completion >= 100} role="img" aria-label={`Report ${completion}% complete`}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle class="ring-bg" cx="32" cy="32" r="26" />
              <circle class="ring-fg" cx="32" cy="32" r="26" stroke-dasharray={ringC} stroke-dashoffset={ringOff} />
            </svg>
            <strong>{completion}%</strong>
          </div>
          <div class="hero-cta">
            <NotificationBell />
            <a href="/reports/current?step=teaching" class="dash-cta">{ctaLabel} →</a>
          </div>
        </div>
      </section>

      <section class="check-card" aria-label="This week's checklist">
        <div class="panel-head"><h2>This week's checklist</h2></div>
        <a class="check-row" href="/reports/current?step=teaching">
          <span class="check-dot" class:done={teachingDone}></span>
          <span class="check-label">Teaching & delivery</span>
          <span class="check-meta">{teachingDone ? `${conducted} / ${scheduled} classes` : 'Not started'}</span>
          <span class="check-go" aria-hidden="true">→</span>
        </a>
        <a class="check-row" href="/reports/current?step=research">
          <span class="check-dot" class:done={researchCount > 0}></span>
          <span class="check-label">Research & publications</span>
          <span class="check-meta">{researchCount > 0 ? `${researchCount} record${researchCount === 1 ? '' : 's'}` : 'Not started'}</span>
          <span class="check-go" aria-hidden="true">→</span>
        </a>
        <a class="check-row" href="/reports/current?step=duties">
          <span class="check-dot" class:done={dutiesCount > 0}></span>
          <span class="check-label">Institutional duties</span>
          <span class="check-meta">{dutiesCount > 0 ? `${dutiesCount} ${dutiesCount === 1 ? 'duty' : 'duties'}` : 'Not started'}</span>
          <span class="check-go" aria-hidden="true">→</span>
        </a>
        <a class="check-row" href="/reports/current?step=outreach">
          <span class="check-dot" class:done={outreachCount > 0}></span>
          <span class="check-label">Outreach</span>
          <span class="check-meta">{outreachCount > 0 ? `${outreachCount} ${outreachCount === 1 ? 'activity' : 'activities'}` : 'Not started'}</span>
          <span class="check-go" aria-hidden="true">→</span>
        </a>
        <a class="check-row" href="/reports/current?step=files">
          <span class="check-dot" class:done={filesCount > 0}></span>
          <span class="check-label">Supporting files</span>
          <span class="check-meta">{filesCount > 0 ? `${filesCount} attached` : 'None yet'}</span>
          <span class="check-go" aria-hidden="true">→</span>
        </a>
      </section>

      {#if weeks.length}
        <section class="graph-card" aria-label="Report progress">
          <div class="panel-head">
            <h2>Progress</h2>
            <div class="graph-legend" aria-hidden="true">
              <span class="legend-dot" style="background:var(--line-light)"></span><span>None</span>
              <span class="legend-dot" style="background:var(--draft-bg)"></span><span>Draft</span>
              <span class="legend-dot" style="background:var(--blue-soft)"></span><span>Submitted</span>
              <span class="legend-dot" style="background:var(--success-bg)"></span><span>Approved</span>
              <span class="legend-dot" style="background:var(--red-soft)"></span><span>Changes</span>
            </div>
          </div>
          <div class="graph-body">
            {#each weekGroups as group}
              <div class="graph-month">
                <span class="graph-month-label">{group.label}</span>
                <div class="graph-cells">
                  {#each group.weeks as week}
                    {@const rid = history.find((h) => h.period_id === week.id)?.id}
                    {@const gcls = weekCellClass('faculty', week)}
                    {@const shade = gcls === 'c-draft' ? 0.55 + (0.45 * Number(week.completion ?? 0)) / 100 : 1}
                    {#if week.id === currentPeriodId}
                      <a
                        class="week-cell graph-cell {gcls} current"
                        href="/reports/current?step=teaching"
                        title={graphTip(week)}
                        aria-label={graphTip(week)}
                        style="opacity:{shade.toFixed(2)}"
                      ></a>
                    {:else if rid}
                      <a
                        class="week-cell graph-cell {gcls}"
                        href="/reports/{rid}"
                        title={graphTip(week)}
                        aria-label={graphTip(week)}
                        style="opacity:{shade.toFixed(2)}"
                      ></a>
                    {:else}
                      <span
                        class="week-cell graph-cell {gcls}"
                        title={graphTip(week)}
                        style="opacity:{shade.toFixed(2)}"
                      ></span>
                    {/if}
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {:else}
        <section class="graph-card">
          <div class="graph-empty">No reporting weeks yet. Ask your HOD or admin to open a reporting period.</div>
        </section>
      {/if}

    <section class="reports-panel">
      <div class="panel-head">
        <h2>Recent reports</h2>
      </div>
      {#if history.length}
        {#each history.slice(0, 3) as r}
          <a class="hist-row" href="/reports/{r.id}">
            <strong>{r.period_label}</strong>
            <StatusPill status={r.status} />
          </a>
        {/each}
      {:else}
        <div class="hist-empty">Nothing here yet — your submitted reports will appear in this list.</div>
      {/if}
      <a href="/reports" class="reports-viewall">View all reports →</a>
    </section>
  {:else}
    <ReviewerDashboard
      name={greetingName(user?.name)}
      {weeks}
      loading={false}
      {selectedPeriod}
      {weekDetail}
      {detailLoading}
      {currentPeriodId}
      onselect={selectWeek}
    />
  {/if}
</main>

<style>
  .graph-legend .legend-dot { width: 8px; height: 8px; border-radius: 2px; flex: none; border: 1px solid var(--line); display: inline-block; }
  .graph-card .week-cell.c-none { background: #eef2f6; color: var(--gray); }
  .graph-card .week-cell.c-draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .graph-card .week-cell.c-submitted { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .graph-card .week-cell.c-approved { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .graph-card .week-cell.c-changes { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .graph-card .week-cell { width: 20px; height: 20px; border: 1px solid var(--line); border-radius: 6px; padding: 0; font-size: 0; display: grid; place-items: center; box-shadow: var(--shadow-xs); transition: transform 0.12s ease, border-color 0.12s ease; }
  .graph-card .week-cell:hover { transform: scale(1.15); z-index: 2; border-color: var(--blue-border); }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 11px 20px; border-radius: 8px; background: var(--navy); color: var(--paper); text-decoration: none; font-size: 0.82rem; font-weight: 750; white-space: nowrap; box-shadow: var(--shadow-sm); transition: background 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease; }
  .dash-cta:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .reports-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
  .reports-viewall { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--blue); text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .reports-viewall:hover { background: var(--paper); }
  .hist-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 13px 20px; text-decoration: none; border-bottom: 1px solid var(--line-2); transition: background 0.1s ease; }
  .hist-row:last-child { border-bottom: 0; }
  .hist-row:hover { background: #f6f9fc; }
  .hist-row strong { font-size: 0.82rem; color: var(--ink-2); font-weight: 700; }
  .hist-empty { padding: 24px 18px; text-align: center; color: var(--muted-2); font-size: 0.8rem; }
  .hero { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 20px; background: linear-gradient(135deg, var(--navy) 0%, var(--navy-2) 60%, #28354d 100%); border: 1px solid var(--navy); border-radius: var(--radius-lg); padding: 28px 30px; box-shadow: var(--shadow-md); color: var(--paper); }
  .hero-main { min-width: 0; }
  .hero-eyebrow { display: block; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--blue-soft); margin-bottom: 8px; }
  .hero-main h1 { font-size: 1.7rem; letter-spacing: -0.03em; margin: 0 0 8px; font-weight: 750; color: #ffffff; }
  .hero-deadline { margin: 0; font-size: 0.88rem; color: var(--sidebar-text); }
  .hero-deadline.urgent { color: var(--warn-soft); font-weight: 750; }
  .hero-deadline.passed { color: #f0b4b4; font-weight: 750; }
  .hero-side { display: flex; align-items: center; gap: 22px; flex: none; }
  .ring { position: relative; width: 78px; height: 78px; flex: none; }
  .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring-bg, .ring-fg { fill: none; stroke-width: 7; stroke-linecap: round; }
  .ring-bg { stroke: rgba(255, 255, 255, 0.14); }
  .ring-fg { stroke: var(--blue-soft); transition: stroke-dashoffset 0.4s ease; }
  .ring.done .ring-fg { stroke: #7fd6a4; }
  .ring strong { position: absolute; inset: 0; display: grid; place-items: center; font-size: 0.82rem; font-weight: 800; color: #ffffff; }
  .hero-cta { display: flex; align-items: center; gap: 12px; }
  .hero-cta :global(.notif-btn) { color: var(--sidebar-text); }
  .hero-cta :global(.notif-btn:hover) { color: #fff; background: rgba(255, 255, 255, 0.1); border-color: transparent; }
  .hero .dash-cta { background: var(--paper); color: var(--navy); border-color: var(--paper); font-size: 0.86rem; padding: 12px 22px; }
  .hero .dash-cta:hover { background: #ffffff; border-color: #ffffff; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); transform: translateY(-1px); }
  .check-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 20px; box-shadow: var(--shadow-sm); }
  .check-row { display: flex; align-items: center; gap: 13px; padding: 14px 22px; text-decoration: none; border-bottom: 1px solid var(--line-2); transition: background 0.1s ease; }
  .check-row:last-child { border-bottom: 0; }
  .check-row:hover { background: #f6f9fc; }
  .check-dot { width: 11px; height: 11px; border-radius: 50%; flex: none; background: var(--line); border: 2px solid var(--line); }
  .check-dot.done { background: #2f9e63; border-color: #2f9e63; }
  .check-label { flex: 1; min-width: 0; font-size: 0.86rem; font-weight: 700; color: var(--text-1); }
  .check-meta { flex: none; font-size: 0.76rem; color: var(--text-3); }
  .check-go { flex: none; font-size: 0.86rem; font-weight: 800; color: var(--accent); opacity: 0; transform: translateX(-4px); transition: opacity 0.12s ease, transform 0.12s ease; }
  .check-row:hover .check-go { opacity: 1; transform: none; }
  .graph-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 20px; box-shadow: var(--shadow-sm); }
  .graph-legend { display: flex; align-items: center; gap: 4px 10px; font-size: 0.64rem; color: var(--muted-2); white-space: nowrap; }
  .graph-body { padding: 18px 22px 20px; display: grid; gap: 14px; }
  .graph-month { display: grid; gap: 8px; }
  .graph-month-label { color: var(--muted-2); font-size: 0.64rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .graph-cells { display: flex; flex-wrap: wrap; gap: 6px; }
  .graph-cell { width: 20px; height: 20px; border-radius: 6px; padding: 0; cursor: default; font-size: 0; }
  a.graph-cell { cursor: pointer; }
  .graph-cell:hover { transform: scale(1.15); z-index: 2; }
  .graph-cell.current { box-shadow: 0 0 0 2px var(--panel), 0 0 0 4px var(--accent); }
  .graph-empty { padding: 26px 22px; color: var(--muted-2); font-size: 0.82rem; text-align: center; }
  @media (max-width: 800px) {
    .hero { flex-direction: column; align-items: start; padding: 24px; }
    .hero-side { width: 100%; justify-content: space-between; }
  }
</style>
