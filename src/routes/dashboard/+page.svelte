<script lang="ts">
  import { onMount } from 'svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
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

  type Week = {
    id: string;
    starts_on: string;
    ends_on: string;
    due_on: string;
    is_open: number;
    week_label: string;
    status?: string | null;
    completion?: number;
    total?: number;
    submitted?: number;
    approved?: number;
    level?: number;
    late?: number;
  };
  let weeks = $state<Week[]>([]);
  let weeksLoading = $state(true);
  let selectedPeriod = $state<string | null>(null);
  let weekDetail = $state<any>(null);
  let detailLoading = $state(false);
  let timelineEl = $state<HTMLElement | null>(null);
  let tooltipText = $state('');
  let tooltipVisible = $state(false);
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);
  const currentPeriodId = $derived(weeks.find((w) => Number(w.is_open) === 1)?.id ?? null);
  const years = $derived(
    [...new Set(weeks.map((w) => new Date(w.starts_on + 'T00:00:00').getFullYear()))].sort((a, b) => b - a),
  );
  let selectedYear = $state<number | null>(null);
  const activeYear = $derived(selectedYear ?? years[0] ?? new Date().getFullYear());
  type WeekGroup = { label: string; weeks: Week[] };
  const activeWeeks = $derived(
    weeks
      .filter((w) => new Date(w.starts_on + 'T00:00:00').getFullYear() === activeYear)
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on)),
  );
  const weekGroups = $derived.by((): WeekGroup[] => {
    const yearWeeks = weeks
      .filter((w) => new Date(w.starts_on + 'T00:00:00').getFullYear() === activeYear)
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
    const groups = new Map<string, WeekGroup>();
    for (const week of yearWeeks) {
      const date = new Date(week.starts_on + 'T00:00:00');
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const group = groups.get(key) ?? {
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        weeks: [],
      };
      group.weeks.push(week);
      groups.set(key, group);
    }
    return [...groups.values()];
  });
  const activeWeekCount = $derived(activeWeeks.length);
  const graphStatus = (s: string | null | undefined) =>
    s === 'APPROVED' ? 'Approved' : s === 'SUBMITTED' ? 'Submitted' : s === 'CHANGES_REQUIRED' ? 'Changes requested' : s === 'DRAFT' ? 'Draft' : 'Not started';
  function graphTip(w: Week) {
    const base = `${w.week_label} · ${graphStatus(w.status)}`;
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
    selectedPeriod = id;
    detailLoading = true;
    weekDetail = null;
    try {
      const res = await fetch(`/api/dashboard/weeks?period=${id}`);
      const d = await res.json();
      weekDetail = d;
    } finally { detailLoading = false; }
  }
  function pickYear(y: number) {
    selectedYear = y;
    selectedPeriod = null;
    weekDetail = null;
    const openPeriod = weeks.find(
      (w) => Number(w.is_open) === 1 && new Date(w.starts_on + 'T00:00:00').getFullYear() === y,
    );
    if (openPeriod) selectWeek(openPeriod.id);
  }
  onMount(() => {
    loadWeeks();
    const onScroll = () => {
      if (!timelineEl) return;
      const maxScroll = timelineEl.scrollWidth - timelineEl.clientWidth;
      if (timelineEl.scrollLeft > maxScroll) timelineEl.scrollLeft = maxScroll;
      updateArrows();
    };
    timelineEl?.addEventListener('scroll', onScroll);
    return () => timelineEl?.removeEventListener('scroll', onScroll);
  });
  $effect(() => {
    if (weeks.length && timelineEl) {
      queueMicrotask(() => {
        if (!timelineEl) return;
        const currentCell = timelineEl.querySelector('.week-cell.current');
        if (currentCell) {
          const rect = currentCell.getBoundingClientRect();
          const tlRect = timelineEl.getBoundingClientRect();
          timelineEl.scrollLeft = timelineEl.scrollLeft + (rect.right - tlRect.right) + 24;
        }
        updateArrows();
      });
    }
  });
  function updateArrows() {
    if (!timelineEl) return;
    const maxScroll = timelineEl.scrollWidth - timelineEl.clientWidth;
    canScrollLeft = timelineEl.scrollLeft > 4;
    canScrollRight = maxScroll > 4 && timelineEl.scrollLeft < maxScroll - 4;
  }
  function scrollWeeks(direction: number) {
    timelineEl?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }
  const statusLabel = (s: string | null | undefined) =>
    s === 'APPROVED' ? 'Approved' : s === 'SUBMITTED' ? 'Submitted' : s === 'CHANGES_REQUIRED' ? 'Changes' : 'Not started';
  function weekCellClass(w: Week) {
    if (isFaculty) {
      if (w.status === 'APPROVED') return 'c-approved';
      if (w.status === 'SUBMITTED') return 'c-submitted';
      if (w.status === 'CHANGES_REQUIRED') return 'c-changes';
      return 'c-none';
    }
    if (Number(w.level) === 4) return 'c-approved';
    if (Number(w.level) === 3) return 'c-submitted';
    if (Number(w.level) === 2) return 'c-draft';
    return 'c-none';
  }
  function weekTip(w: Week) {
    if (isFaculty) return `${w.week_label}${w.status ? ` · ${statusLabel(w.status)}` : ''}`;
    const done = Number(w.submitted) + Number(w.approved);
    const parts = [`${w.week_label}`, `${done}/${w.total} submitted`];
    if (Number(w.approved)) parts.push(`${w.approved} approved`);
    if (Number(w.late)) parts.push('overdue');
    return parts.join(' · ');
  }
  function showTip(e: MouseEvent, w: Week) {
    tooltipText = weekTip(w);
    tooltipVisible = true;
    positionTip(e);
  }
  function positionTip(e: MouseEvent) {
    tooltipX = e.clientX;
    tooltipY = e.clientY - 10;
  }
  function hideTip() { tooltipVisible = false; }
</script>

<svelte:head><title>Dashboard · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  {#if loading}
    <div class="loading-panel"><span class="spinner"></span><span>Loading dashboard…</span></div>
  {:else if noPeriod}
    <div class="no-period-card">
      <h1>Reporting is paused</h1>
      <p>There is no open reporting period right now, so there is nothing to fill in. Ask your HOD or admin to open the next period.</p>
      <a href="/reports" class="dash-cta">View past reports →</a>
    </div>
  {:else if error}
    <div class="error-panel">{error}</div>
  {:else}
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
                    {@const gcls = weekCellClass(week)}
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
    {:else}
      <header class="dash-header">
      <div>
        <h1>{user?.name ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${greetingName(user.name)}` : 'Dashboard'}</h1>
        <span class="dash-period">{periodLabel}</span>
      </div>
      <div class="dash-actions">
        <NotificationBell />
        <a href="/reports/current" class="dash-cta"
          >{status === 'Approved' ? 'View report' : status === 'Submitted' ? 'View submitted' : 'Continue report'} →</a
        >
      </div>
    </header>

    <div class="dash-status-line">
      {#if !teaching.length}
        <span>No classes added yet</span>
      {:else}
        <span>{conducted}<em> / {scheduled}</em> classes</span>
      {/if}
      {#if deadline}
        <span class="dash-sep">·</span>
        <span class:urgent={deadlineUrgent} class:passed={deadlinePassed}>{deadlinePassed ? 'Deadline passed' : deadlineUrgent ? `${deadlineHours}h left` : `Due ${deadline}`}</span>
      {/if}
      <span class="dash-sep">·</span>
      <span class="dash-pill dash-pill-{status === 'Draft' ? 'draft' : status === 'Submitted' ? 'submitted' : status === 'Approved' ? 'approved' : status === 'Changes required' ? 'changes' : 'none'}">{status}</span>
    </div>

    <div class="dash-row">
      <section class="weeks-card">
        <div class="panel-head weeks-head">
          <div class="weeks-title">
            <h2>Reporting weeks</h2>
            {#if !weeksLoading && weeks.length}
              <span class="weeks-count">{activeWeekCount} week{activeWeekCount === 1 ? '' : 's'} · {activeYear}</span>
            {/if}
          </div>
          {#if years.length > 1}
            <div class="weeks-years">
              {#each years as y}
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
        {#if weeksLoading}
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
                {#if activeWeekCount > 1}<span class="weeks-empty-label">New Semester Begins</span>{/if}
                {#each weekGroups as group}
                  <div class="week-month">
                    <span class="week-month-label">{group.label}</span>
                    <div class="week-strip">
                      {#each group.weeks as week}
                        <button
                          class="week-cell {weekCellClass(week)}"
                          class:current={week.id === currentPeriodId}
                          class:sel={week.id === selectedPeriod}
                          class:late={Number(week.late) === 1}
                          aria-label={weekTip(week)}
                          onclick={() => selectWeek(week.id)}
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
                <span class="wp-pill {weekDetail.report ? 'wp-' + (weekDetail.report.status === 'APPROVED' ? 'ok' : weekDetail.report.status === 'SUBMITTED' ? 'sub' : weekDetail.report.status === 'CHANGES_REQUIRED' ? 'chg' : 'draft') : 'wp-none'}">{weekDetail.report ? statusLabel(weekDetail.report.status) : 'Not started'}</span>
              </div>
            {/if}
          </div>
          {#if !isFaculty && weekDetail?.reports?.length}
            {@const submitted = weekDetail.reports.filter((r: any) => r.status === 'SUBMITTED').length}
            {@const approved = weekDetail.reports.filter((r: any) => r.status === 'APPROVED').length}
            {@const total = weekDetail.reports.length}
            <div class="weeks-reports-summary">
              <span>{approved}/{total} approved · {submitted} pending review</span>
              <a href="/admin/reports">View all →</a>
            </div>
          {/if}
        {/if}
      </section>

      <div class="attention-card">
        <div class="panel-head">
          <h2>Attention</h2>
        </div>
        {#if status === 'No report' || status === 'Draft'}
          <div class="attn-row">
            <span class="attn-icon warn">!</span>
            <div>
              <strong>Report is {status === 'No report' ? 'not started' : 'incomplete'}</strong>
              <p>Add this week's classes and submit before Friday's deadline. Tip: save your repeating subjects once as a recurring template and every week starts pre-filled.</p>
            </div>
          </div>
          <a href="/reports/current" class="attn-action">{status === 'No report' ? 'Start your first report →' : 'Open report →'}</a>
        {:else if status === 'Submitted'}
          <div class="attn-row">
            <span class="attn-icon info">i</span>
            <div>
              <strong>Report under review</strong>
              <p>Your HOD will review it shortly.</p>
            </div>
          </div>
          <a href="/reports/current" class="attn-action">View submitted →</a>
        {:else if status === 'Approved'}
          <div class="attn-row">
            <span class="attn-icon ok">✓</span>
            <div>
              <strong>Report approved</strong>
              <p>No action needed for {periodLabel}.</p>
            </div>
          </div>
          <a href="/reports/current" class="attn-action">View report →</a>
        {:else if status === 'Changes required'}
          <div class="attn-row">
            <span class="attn-icon warn">!</span>
            <div>
              <strong>Changes requested</strong>
              <p>Review HOD feedback and resubmit.</p>
            </div>
          </div>
          <a href="/reports/current" class="attn-action">Review →</a>
        {/if}
      </div>
    </div>
    {/if}

    {#if isFaculty}
      <section class="reports-panel">
        <div class="panel-head">
          <h2>Recent reports</h2>
        </div>
        {#if history.length}
          {#each history.slice(0, 3) as r}
            <a class="hist-row" href="/reports/{r.id}">
              <strong>{r.period_label}</strong>
              <span class="hist-status">{r.status === 'DRAFT' ? 'Draft' : r.status === 'SUBMITTED' ? 'Submitted' : r.status === 'APPROVED' ? 'Approved' : 'Changes requested'}</span>
            </a>
          {/each}
        {:else}
          <div class="hist-empty">Nothing here yet — your submitted reports will appear in this list.</div>
        {/if}
        <a href="/reports" class="reports-viewall">View all reports →</a>
      </section>
    {:else}
    <section class="reports-panel">
      <div class="panel-head">
        <h2>Recent reports</h2>
      </div>
      {#if history.length}
        {#each history as r}
          <a class="hist-row" href="/reports/{r.id}">
            <strong>{r.period_label}</strong>
            <span class="hist-pill" class:hist-draft={r.status === 'DRAFT'} class:hist-sub={r.status === 'SUBMITTED'} class:hist-ok={r.status === 'APPROVED'} class:hist-chg={r.status === 'CHANGES_REQUIRED'}>{r.status === 'DRAFT' ? 'Draft' : r.status === 'SUBMITTED' ? 'Submitted' : r.status === 'APPROVED' ? 'Approved' : 'Changes'}</span>
          </a>
        {/each}
      {:else}
        <div class="hist-empty">Nothing here yet — your submitted reports will appear in this list.</div>
      {/if}
      <a href="/reports" class="reports-viewall">View all reports →</a>
    </section>
    {/if}
  {/if}
  {#if tooltipVisible}
    <div class="week-tooltip" style="left:{tooltipX}px;top:{tooltipY}px">{tooltipText}</div>
  {/if}
</main>

<style>
  .loading-panel { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: var(--muted-3); font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-panel { padding: 16px 20px; background: var(--red-bg); color: var(--red); border-radius: 7px; font-size: 0.88rem; }
  .no-period-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 44px 40px; box-shadow: var(--shadow-sm); text-align: center; max-width: 560px; margin: 40px auto; }
  .no-period-card h1 { font-size: 1.5rem; letter-spacing: -0.02em; margin: 0 0 10px; font-weight: 750; color: var(--text-1); }
  .no-period-card p { margin: 0 0 22px; color: var(--text-3); font-size: 0.88rem; line-height: 1.55; }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 14px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px 24px; box-shadow: var(--shadow-sm); }
  .dash-header h1 { font-size: 1.55rem; letter-spacing: -0.03em; margin: 0 0 4px; font-weight: 750; color: var(--text-1); }
  .dash-period { font-size: 0.84rem; color: var(--text-3); }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 11px 20px; border-radius: 8px; background: var(--navy); color: var(--paper); text-decoration: none; font-size: 0.82rem; font-weight: 750; white-space: nowrap; box-shadow: var(--shadow-sm); transition: background 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease; }
  .dash-cta:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .dash-status-line { display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: var(--text-3); margin-bottom: 24px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 11px 16px; box-shadow: var(--shadow-xs); }
  .dash-status-line em { font-style: normal; color: var(--muted-2); }
  .dash-sep { color: var(--muted-3); }
  .dash-status-line .urgent { color: var(--warn-dark); font-weight: 700; }
  .dash-status-line .passed { color: var(--red); font-weight: 700; }
  .dash-pill { display: inline-flex; align-items: center; padding: 4px 11px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.01em; border: 1px solid transparent; }
  .dash-pill-draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .dash-pill-submitted { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .dash-pill-approved { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .dash-pill-changes { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .dash-pill-none { background: var(--line-light); border-color: var(--line); color: var(--gray); }
  .dash-row { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: start; margin-bottom: 24px; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 17px 22px; border-bottom: 1px solid var(--line); background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent); }
  .panel-head h2 { font-size: 0.92rem; margin: 0; letter-spacing: -0.01em; font-weight: 750; color: var(--text-1); }
  .attention-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; align-self: stretch; display: flex; flex-direction: column; box-shadow: var(--shadow-sm); border-top: 3px solid var(--accent); }
  .attention-card .attn-row { flex: 1; }
  .reports-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
  .reports-viewall { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--blue); text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .reports-viewall:hover { background: var(--paper); }
  .attn-row { display: flex; gap: 13px; padding: 16px 18px; align-items: start; }
  .attn-icon { width: 23px; height: 23px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 0.72rem; flex: none; margin-top: 1px; }
  .attn-icon.warn { background: var(--warn-soft); color: var(--warn-dark); }
  .attn-icon.info { background: var(--blue-soft); color: var(--blue-dark); }
  .attn-icon.ok { background: var(--green-soft); color: var(--green); }
  .attn-row strong { display: block; font-size: 0.8rem; margin-bottom: 2px; }
  .attn-row p { margin: 0 0 5px; color: var(--muted); font-size: 0.74rem; line-height: 1.4; }
  .attn-action { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--blue); text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .attn-action:hover { background: var(--paper); }
  .hist-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 13px 20px; text-decoration: none; border-bottom: 1px solid var(--line-2); transition: background 0.1s ease; }
  .hist-row:last-child { border-bottom: 0; }
  .hist-row:hover { background: #f6f9fc; }
  .hist-row strong { font-size: 0.82rem; color: var(--ink-2); font-weight: 700; }
  .hist-pill { font-size: 0.66rem; font-weight: 800; padding: 4px 9px; border-radius: 999px; border: 1px solid transparent; }
  .hist-draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .hist-sub { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .hist-ok { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .hist-chg { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .hist-empty { padding: 24px 18px; text-align: center; color: var(--muted-2); font-size: 0.8rem; }
  .weeks-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); min-width: 0; overflow: hidden; box-shadow: var(--shadow-sm); }
  .weeks-head { gap: 14px; flex-wrap: wrap; overflow: hidden; border-radius: 8px 8px 0 0; }
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
  .wp-pill { font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; }
  .wp-ok { background: var(--green-soft); color: var(--green); }
  .wp-sub { background: var(--blue-soft); color: var(--blue-dark); }
  .wp-chg { background: var(--red-soft); color: var(--red-dark); }
  .wp-draft { background: var(--warn-soft); color: var(--warn-dark); }
  .wp-none { background: var(--line-light); color: var(--gray); }
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
  .hist-status { flex: none; font-size: 0.74rem; color: var(--text-3); font-weight: 600; }
  @media (max-width: 800px) {
    .dash-header { flex-direction: column; align-items: start; }
    .hero { flex-direction: column; align-items: start; padding: 24px; }
    .hero-side { width: 100%; justify-content: space-between; }
  }
  @media (max-width: 600px) {
    .weeks-timeline-row { flex-direction: column; align-items: stretch; gap: 10px; }
    .selected-status { justify-content: flex-end; }
  }
  @media (max-width: 500px) {
    .dash-actions { flex-wrap: wrap; }
  }
</style>
