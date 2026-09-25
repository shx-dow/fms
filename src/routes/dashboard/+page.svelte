<script lang="ts">
  import { onMount } from 'svelte';
  import AsyncState from '$lib/components/AsyncState.svelte';
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
  let completion = $state(0);
  let scheduled = $state(0);
  let conducted = $state(0);
  let syllabus = $state(0);
  let periodLabel = $state('');
  let status = $state('Draft');
  let dueDate = $state('');
  let history = $state<{ id: string; status: string; completion: number; period_label: string; period_id?: string; updated_at: string; submitted_at?: string }[]>([]);
  let teaching = $state<{ course_code: string; course_name: string; class_type: string; scheduled: number; conducted: number; syllabus_completion: number }[]>([]);
  let reportId = $state('');
  let researchCount = $state(0);
  let dutiesCount = $state(0);
  let outreachCount = $state(0);
  let filesCount = $state(0);
  let loading = $state(true);
  let error = $state('');
  let noPeriod = $state(false);
  onMount(async () => {
    if (!isFaculty) { loading = false; return; }
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (res.status === 409) { noPeriod = true; return; }
      if (!res.ok) { error = 'Unable to load dashboard data.'; return; }
      const r = data.report;
      completion = r?.completion ?? 0;
      reportId = r?.id ?? '';
      periodLabel = r?.period_label ?? '';
      dueDate = r?.due_on ?? '';
      status = !r ? 'No report' : r.status === 'SUBMITTED' ? 'Submitted' : r.status === 'APPROVED' ? 'Approved' : r.status === 'CHANGES_REQUIRED' ? 'Changes required' : 'Draft';
      history = (data.reports ?? []).slice(0, 5);
      const realRows = (arr: any[] | undefined, key: string) =>
        (arr ?? []).filter((x: any) => (x[key] ?? '').trim() && (x[key] ?? '').trim() !== 'N/A').length;
      researchCount = realRows(data.research, 'title');
      dutiesCount = realRows(data.duties, 'name');
      outreachCount = realRows(data.outreach, 'activity');
      if (data.teaching?.length) {
        teaching = data.teaching.map((t: any) => ({
          course_code: t.course_code ?? '',
          course_name: t.course_name ?? '',
          class_type: t.class_type ?? '',
          scheduled: Number(t.scheduled) || 0,
          conducted: Number(t.conducted) || 0,
          syllabus_completion: Number(t.syllabus_completion) || 0,
        }));
      } else {
        teaching = [];
      }
      scheduled = teaching.reduce((a, t) => a + t.scheduled, 0);
      conducted = teaching.reduce((a, t) => a + t.conducted, 0);
      syllabus = teaching.length ? Math.round(teaching.reduce((a, t) => a + t.syllabus_completion, 0) / teaching.length) : 0;
      if (reportId) {
        try {
          const ar = await fetch(`/api/attachments?reportId=${reportId}`);
          const ad = await ar.json();
          filesCount = (ad.attachments ?? []).length;
        } catch { filesCount = 0; }
      }
    } catch { error = 'Unable to connect to the server.'; }
    finally { loading = false; }
  });
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
  const teachingDone = $derived(teaching.some((t) => (t.course_code ?? '').trim() || (t.course_name ?? '').trim()));

  let weeks = $state<Week[]>([]);
  let weeksLoading = $state(true);
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

  async function loadWeeks() {
    try {
      const res = await fetch('/api/dashboard/weeks');
      const d = await res.json();
      weeks = d.weeks ?? [];
      if (currentPeriodId) selectWeek(currentPeriodId);
    } finally { weeksLoading = false; }
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

  onMount(() => {
    loadWeeks();
  });
</script>

<svelte:head><title>Dashboard · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  {#if loading}
    <AsyncState kind="loading" message="Loading dashboard…" />
  {:else if noPeriod}
    <div class="no-period-card">
      <h1>Reporting is paused</h1>
      <p>There is no open reporting period right now, so there is nothing to fill in. Ask your HOD or admin to open the next period.</p>
      <a href="/reports" class="dash-cta">View past reports →</a>
    </div>
  {:else if error}
    <AsyncState kind="error" message={error} />
  {:else if isFaculty}
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

      {#if !weeksLoading && weeks.length}
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
      {:else if !weeksLoading}
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
      loading={weeksLoading}
      {selectedPeriod}
      {weekDetail}
      {detailLoading}
      {currentPeriodId}
      onselect={selectWeek}
    />
  {/if}
</main>

<style>
  .no-period-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 44px 40px; box-shadow: var(--shadow-sm); text-align: center; max-width: 560px; margin: 40px auto; }
  .no-period-card h1 { font-size: 1.5rem; letter-spacing: -0.02em; margin: 0 0 10px; font-weight: 750; color: var(--text-1); }
  .no-period-card p { margin: 0 0 22px; color: var(--text-3); font-size: 0.88rem; line-height: 1.55; }
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
