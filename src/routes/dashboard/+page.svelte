<script lang="ts">
  import { onMount } from 'svelte';
  let { data } = $props();
  const user = $derived(data.user);
  const isFaculty = $derived(user?.role === 'FACULTY');
  let completion = $state(0);
  let scheduled = $state(0);
  let conducted = $state(0);
  let syllabus = $state(0);
  let periodLabel = $state('');
  let status = $state('Draft');
  let dueDate = $state('');
  let history = $state<{ id: string; status: string; completion: number; period_label: string; updated_at: string; submitted_at?: string }[]>([]);
  let teaching = $state<{ course_code: string; course_name: string; class_type: string; scheduled: number; conducted: number; syllabus_completion: number }[]>([]);
  let loading = $state(true);
  let error = $state('');
  onMount(async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (!res.ok) { error = 'Unable to load dashboard data.'; return; }
      const r = data.report;
      completion = r?.completion ?? 0;
      periodLabel = r?.period_label ?? '';
      dueDate = r?.due_on ?? '';
      status = !r ? 'No report' : r.status === 'SUBMITTED' ? 'Submitted' : r.status === 'APPROVED' ? 'Approved' : r.status === 'CHANGES_REQUIRED' ? 'Changes required' : 'Draft';
      history = (data.reports ?? []).slice(0, 5);
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
        teaching = [
          { course_code: 'CS201', course_name: 'Data Structures', class_type: 'Lecture', scheduled: 5, conducted: 4, syllabus_completion: 80 },
          { course_code: 'CS301', course_name: 'Algorithms', class_type: 'Lecture', scheduled: 3, conducted: 3, syllabus_completion: 65 },
          { course_code: 'CS401', course_name: 'Computer Networks', class_type: 'Tutorial', scheduled: 2, conducted: 2, syllabus_completion: 90 },
          { course_code: 'CS250', course_name: 'Database Systems', class_type: 'Lab', scheduled: 4, conducted: 3, syllabus_completion: 45 },
        ];
      }
      scheduled = teaching.reduce((a, t) => a + t.scheduled, 0);
      conducted = teaching.reduce((a, t) => a + t.conducted, 0);
      syllabus = teaching.length ? Math.round(teaching.reduce((a, t) => a + t.syllabus_completion, 0) / teaching.length) : 0;
    } catch { error = 'Unable to connect to the server.'; }
    finally { loading = false; }
  });
  const deadline = $derived(dueDate ? new Date(dueDate).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  const deliveryRate = $derived(scheduled ? Math.round((conducted / scheduled) * 100) : null);
  const deadlineMs = $derived(dueDate ? new Date(dueDate).getTime() - Date.now() : 0);
  const deadlineHours = $derived(Math.round(deadlineMs / 3600000));
  const deadlineUrgent = $derived(deadlineMs > 0 && deadlineHours < 24 && (status === 'Draft' || status === 'No report' || status === 'Changes required'));
  const deadlinePassed = $derived(deadlineMs < 0 && (status === 'Draft' || status === 'No report' || status === 'Changes required'));

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
  {:else if error}
    <div class="error-panel">{error}</div>
  {:else}
    <header class="dash-header">
      <div>
        <h1>{user?.name ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]}` : 'Dashboard'}</h1>
        <span class="dash-period">{periodLabel}</span>
      </div>
      <div class="dash-actions">
        <a href="/reports/current" class="dash-cta"
          >{status === 'Approved' ? 'View report' : status === 'Submitted' ? 'View submitted' : 'Continue report'} →</a
        >
      </div>
    </header>

    <div class="dash-status-line">
      <span>{conducted}<em> / {scheduled}</em> classes</span>
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
            <span class="legend-dot" style="background:#e2e2e2"></span><span>No report</span>
            <span class="legend-dot" style="background:#f0d48a"></span><span>Draft</span>
            <span class="legend-dot" style="background:#8bbdd9"></span><span>Submitted</span>
            <span class="legend-dot" style="background:#7fbf97"></span><span>Approved</span>
            <span class="legend-dot" style="background:#e09080"></span><span>Changes</span>
          </div>
        </div>
        {#if weeksLoading}
          <div class="weeks-loading"><span class="spinner"></span></div>
        {:else if !weeks.length}
          <div class="weeks-empty">No reporting weeks yet.</div>
        {:else}
          <div class="weeks-body">
            <div class="weeks-timeline-row">
              <button class="scroll-arrow scroll-left" class:hidden={!canScrollLeft} onclick={() => scrollWeeks(-1)} aria-label="Scroll earlier">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div class="weeks-timeline" bind:this={timelineEl} aria-label={`Reporting weeks for ${activeYear}`}>
                <span class="weeks-empty-label">New Semester Begins</span>
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
              <p>Add this week's activity and submit before the deadline.</p>
            </div>
          </div>
          <a href="/reports/current" class="attn-action">Open report →</a>
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

    <section class="reports-panel">
      <div class="panel-head">
        <h2>Recent reports</h2>
      </div>
      {#if history.length}
        {#each history as r}
          <a class="hist-row" href="/reports/current">
            <strong>{r.period_label}</strong>
            <span class="hist-pill" class:hist-draft={r.status === 'DRAFT'} class:hist-sub={r.status === 'SUBMITTED'} class:hist-ok={r.status === 'APPROVED'} class:hist-chg={r.status === 'CHANGES_REQUIRED'}>{r.status === 'DRAFT' ? 'Draft' : r.status === 'SUBMITTED' ? 'Submitted' : r.status === 'APPROVED' ? 'Approved' : 'Changes'}</span>
          </a>
        {/each}
      {:else}
        <div class="hist-empty">No past reports yet.</div>
      {/if}
      <a href="/reports" class="reports-viewall">View all reports →</a>
    </section>
  {/if}
  {#if tooltipVisible}
    <div class="week-tooltip" style="left:{tooltipX}px;top:{tooltipY}px">{tooltipText}</div>
  {/if}
</main>

<style>
  .loading-panel { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: #71818a; font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dbe3e7; border-top-color: #145b78; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-panel { padding: 16px 20px; background: #f9e9e7; color: #8f413b; border-radius: 7px; font-size: 0.88rem; }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 16px; }
  .dash-header h1 { font-size: 1.5rem; letter-spacing: -0.03em; margin: 0 0 3px; font-weight: 700; }
  .dash-period { font-size: 0.82rem; color: #667477; }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: #17252d; color: #f4f6f5; text-decoration: none; font-size: 0.78rem; font-weight: 700; white-space: nowrap; transition: background 0.14s ease; }
  .dash-cta:hover { background: #294a5a; }
  .dash-status-line { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #667477; margin-bottom: 24px; }
  .dash-status-line em { font-style: normal; color: #87969c; }
  .dash-sep { color: #c4cdd0; }
  .dash-status-line .urgent { color: #8a681d; font-weight: 700; }
  .dash-status-line .passed { color: #a84f42; font-weight: 700; }
  .dash-pill { display: inline-block; padding: 3px 10px; border-radius: 5px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.01em; }
  .dash-pill-draft { background: #f0d48a; color: #7a6420; }
  .dash-pill-submitted { background: #8bbdd9; color: #1a5a7a; }
  .dash-pill-approved { background: #7fbf97; color: #1a5a3a; }
  .dash-pill-changes { background: #e09080; color: #7a3028; }
  .dash-pill-none { background: #e2e2e2; color: #6b6b6b; }
  .dash-row { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: start; margin-bottom: 24px; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #dbe3e7; }
  .panel-head h2 { font-size: 0.9rem; margin: 0; letter-spacing: -0.01em; }
  .attention-card { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; align-self: stretch; display: flex; flex-direction: column; }
  .attention-card .attn-row { flex: 1; }
  .reports-panel { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
  .reports-viewall { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid #dbe3e7; color: #145b78; text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .reports-viewall:hover { background: #f4f6f5; }
  .attn-row { display: flex; gap: 13px; padding: 16px 18px; align-items: start; }
  .attn-icon { width: 23px; height: 23px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 0.72rem; flex: none; margin-top: 1px; }
  .attn-icon.warn { background: #f0d48a; color: #7a6420; }
  .attn-icon.info { background: #8bbdd9; color: #1a5a7a; }
  .attn-icon.ok { background: #7fbf97; color: #1a5a3a; }
  .attn-row strong { display: block; font-size: 0.8rem; margin-bottom: 2px; }
  .attn-row p { margin: 0 0 5px; color: #667477; font-size: 0.74rem; line-height: 1.4; }
  .attn-action { display: block; text-align: center; padding: 14px 20px; border-top: 1px solid #dbe3e7; color: #145b78; text-decoration: none; font-size: 0.78rem; font-weight: 700; transition: background 0.12s ease; }
  .attn-action:hover { background: #f4f6f5; }
  .hist-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; text-decoration: none; border-bottom: 1px solid #e8eeec; transition: background 0.1s ease; }
  .hist-row:last-child { border-bottom: 0; }
  .hist-row:hover { background: #f4f6f5; }
  .hist-row strong { font-size: 0.78rem; color: #1b2b36; }
  .hist-pill { font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; }
  .hist-draft { background: #f0d48a; color: #7a6420; }
  .hist-sub { background: #8bbdd9; color: #1a5a7a; }
  .hist-ok { background: #7fbf97; color: #1a5a3a; }
  .hist-chg { background: #e09080; color: #7a3028; }
  .hist-empty { padding: 24px 18px; text-align: center; color: #87969c; font-size: 0.78rem; }
  .weeks-card { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; min-width: 0; overflow: hidden; }
  .weeks-head { gap: 14px; flex-wrap: wrap; overflow: hidden; border-radius: 8px 8px 0 0; }
  .weeks-title { display: flex; align-items: baseline; gap: 9px; min-width: 0; }
  .weeks-title h2 { white-space: nowrap; }
  .weeks-count { font-size: 0.68rem; font-weight: 600; color: #87969c; white-space: nowrap; }
  .weeks-years { display: flex; align-items: center; gap: 2px; padding: 2px; background: #eef1f2; border: 1px solid #dbe3e7; border-radius: 7px; flex: none; }
  .year-pill { border: 0; background: transparent; font: inherit; font-size: 0.7rem; font-weight: 700; color: #667477; cursor: pointer; padding: 3px 11px; border-radius: 5px; transition: background 0.12s ease, color 0.12s ease; }
  .year-pill:hover { color: #17252d; }
  .year-pill.active { background: #17252d; color: #f4f6f5; }
  .weeks-legend { display: flex; align-items: center; gap: 4px 10px; font-size: 0.62rem; color: #87969c; margin-left: auto; white-space: nowrap; }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; flex: none; border: 1px solid #dbe3e7; }
  .weeks-loading, .weeks-empty { padding: 28px 20px; display: flex; align-items: center; gap: 12px; color: #87969c; font-size: 0.8rem; justify-content: center; }
  .weeks-body { padding: 18px 24px 22px; background: #fbfcfb; min-width: 0; display: flex; flex-direction: column; }
  .weeks-timeline-row { display: flex; align-items: center; gap: 6px; position: relative; }
  .scroll-arrow { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid #dbe3e7; border-radius: 50%; background: #fdfcf9; color: #667477; cursor: pointer; flex: none; transition: opacity 0.15s ease, background 0.12s ease, color 0.12s ease, border-color 0.12s ease; }
  .scroll-arrow.hidden { opacity: 0; pointer-events: none; }
  .scroll-arrow:hover { background: #17252d; color: #f4f6f5; border-color: #17252d; }
  .weeks-timeline { display: flex; align-items: flex-end; gap: 32px; flex: 1; min-width: 0; overflow-x: auto; padding: 6px 4px 8px; scrollbar-width: thin; scroll-behavior: auto; justify-content: flex-end; }
  .weeks-empty-label { color: #9aa8ae; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; align-self: flex-end; margin-bottom: 8px; margin-right: 32px; }
  .week-month { display: grid; gap: 10px; flex: none; }
  .week-month-label { color: #87969c; font-size: 0.64rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  .week-strip { display: flex; gap: 10px; }
  .week-cell { width: 42px; height: 42px; border: 1px solid transparent; border-radius: 8px; padding: 0; cursor: pointer; position: relative; color: #667477; font: inherit; font-size: 0.75rem; font-weight: 800; transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease; }
  .week-cell:hover { transform: translateY(-2px); border-color: #8aabb8; z-index: 2; }
  .week-cell.c-none { background: #e2e2e2; color: #6b6b6b; }
  .week-cell.c-draft { background: #f0d48a; color: #7a6420; }
  .week-cell.c-submitted { background: #8bbdd9; color: #1a5a7a; }
  .week-cell.c-approved { background: #7fbf97; color: #1a5a3a; }
  .week-cell.c-changes { background: #e09080; color: #7a3028; }
  .week-cell.late { border-color: #b25b4e; }
  .week-cell.current { box-shadow: 0 0 0 2px #145b78; }
  .week-cell.sel { border-color: #17252d; box-shadow: 0 0 0 2px #17252d; }
  .week-cell.sel.current { box-shadow: 0 0 0 2px #17252d; }
  .selected-status { display: flex; align-items: center; gap: 8px; padding-top: 12px; margin-left: auto; }
  .weeks-reports-summary { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid #eef2f3; font-size: 0.74rem; color: #667477; }
  .weeks-reports-summary a { color: #145b78; text-decoration: none; font-weight: 700; font-size: 0.73rem; }
  .week-tooltip {
    position: fixed;
    transform: translate(-50%, -100%);
    background: #17252d;
    color: #f4f6f5;
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
  .wp-ok { background: #7fbf97; color: #1a5a3a; }
  .wp-sub { background: #8bbdd9; color: #1a5a7a; }
  .wp-chg { background: #e09080; color: #7a3028; }
  .wp-draft { background: #f0d48a; color: #7a6420; }
  .wp-none { background: #e2e2e2; color: #6b6b6b; }
  @media (max-width: 800px) {
    .dash-header { flex-direction: column; align-items: start; }
  }
  @media (max-width: 600px) {
    .weeks-timeline-row { flex-direction: column; align-items: stretch; gap: 10px; }
    .selected-status { justify-content: flex-end; }
  }
  @media (max-width: 500px) {
    .dash-actions { flex-wrap: wrap; }
  }
</style>
