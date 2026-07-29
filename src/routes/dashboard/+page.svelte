<script lang="ts">
  import { onMount } from 'svelte';
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
        <h1>Dashboard</h1>
        <span class="dash-period">{periodLabel || 'Current week'}</span>
      </div>
      <div class="dash-actions">
        {#if deadlinePassed}
          <span class="dash-badge passed">Deadline passed</span>
        {:else if deadlineUrgent}
          <span class="dash-badge urgent">{deadlineHours}h remaining</span>
        {:else if deadline}
          <span class="dash-badge quiet">{deadline}</span>
        {/if}
        <a href="/reports/current" class="dash-cta"
          >{status === 'Approved' ? 'View report' : status === 'Submitted' ? 'View submitted' : 'Continue report'} →</a
        >
      </div>
    </header>

    <div class="dash-metrics">
      <div>
        <span>Classes conducted</span>
        <strong>{conducted}<em> / {scheduled}</em></strong>
        <small>{deliveryRate !== null ? `${deliveryRate}% delivery` : 'No classes'}</small>
      </div>
      <div>
        <span>Syllabus progress</span>
        <strong>{syllabus}<em>%</em></strong>
        <small>Across {teaching.length} course{teaching.length === 1 ? '' : 's'}</small>
      </div>
      <div>
        <span>Completion</span>
        <strong>{completion}<em>%</em></strong>
        <div class="dash-track"><i style="width:{completion}%"></i></div>
      </div>
      <div>
        <span>Report status</span>
        <strong class="status-badge" class:draft={status === 'Draft'} class:submitted={status === 'Submitted'} class:approved={status === 'Approved'} class:changes={status === 'Changes required'}>{status}</strong>
      </div>
    </div>

    <div class="dash-bottom">
      <section class="teaching-panel">
        <div class="panel-head">
          <h2>This week's teaching</h2>
          <a href="/reports/current">Open report →</a>
        </div>
        {#if teaching.length}
          {#each teaching as c, i}
            <div class="course-row">
              <div class="course-info">
                <strong class="course-code">{c.course_code}</strong>
                <span class="course-name">{c.course_name}</span>
                <span class="course-type">{c.class_type}</span>
              </div>
              <div class="course-stats">
                <div class="course-classes">
                  <span>Classes</span>
                  <strong>{c.conducted}<em> / {c.scheduled}</em></strong>
                </div>
                <div class="course-syll">
                  <span>Syllabus</span>
                  <strong>{c.syllabus_completion}<em>%</em></strong>
                </div>
              </div>
              <div class="course-bar">
                <div class="cbar-track"><i class="cbar-fill" style="width:{c.scheduled ? Math.round((c.conducted / c.scheduled) * 100) : 0}%"></i></div>
              </div>
              <span class="course-mark" class:ok={c.scheduled && c.conducted >= c.scheduled} class:mid={c.scheduled && c.conducted > 0 && c.conducted < c.scheduled} class:low={!c.scheduled || c.conducted === 0}>
                {c.scheduled && c.conducted >= c.scheduled ? '✓' : c.scheduled && c.conducted > 0 ? '△' : '⚠'}
              </span>
            </div>
          {/each}
        {:else}
          <div class="teaching-empty">No courses added to this period yet.</div>
        {/if}
      </section>

      <aside class="side-stack">
        <div class="side-card">
          <div class="panel-head">
            <h2>Attention</h2>
          </div>
          {#if status === 'No report' || status === 'Draft'}
            <div class="attn-row">
              <span class="attn-icon warn">!</span>
              <div>
                <strong>Report is {status === 'No report' ? 'not started' : 'incomplete'}</strong>
                <p>Add this week's activity and submit before the deadline.</p>
                <a href="/reports/current">Open report →</a>
              </div>
            </div>
          {:else if status === 'Submitted'}
            <div class="attn-row">
              <span class="attn-icon info">i</span>
              <div>
                <strong>Report under review</strong>
                <p>Your HOD will review it shortly.</p>
                <a href="/reports/current">View submitted →</a>
              </div>
            </div>
          {:else if status === 'Approved'}
            <div class="attn-row">
              <span class="attn-icon ok">✓</span>
              <div>
                <strong>Report approved</strong>
                <p>No action needed for {periodLabel}.</p>
                <a href="/reports/current">View report →</a>
              </div>
            </div>
          {:else if status === 'Changes required'}
            <div class="attn-row">
              <span class="attn-icon warn">!</span>
              <div>
                <strong>Changes requested</strong>
                <p>Review HOD feedback and resubmit.</p>
                <a href="/reports/current">Review →</a>
              </div>
            </div>
          {/if}
        </div>

        <div class="side-card">
          <div class="panel-head">
            <h2>Recent reports</h2>
            <a href="/reports">View all</a>
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
        </div>
      </aside>
    </div>
  {/if}
</main>

<style>
  .loading-panel { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: #71818a; font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dbe3e7; border-top-color: #145b78; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-panel { padding: 16px 20px; background: #f9e9e7; color: #8f413b; border-radius: 7px; font-size: 0.88rem; }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: #667477; }
  .dash-actions { display: flex; align-items: center; gap: 14px; }
  .dash-badge { font-size: 0.72rem; font-weight: 700; padding: 5px 10px; border-radius: 5px; white-space: nowrap; }
  .dash-badge.passed { background: #f8e8e5; color: #a84f42; }
  .dash-badge.urgent { background: #f4eddd; color: #8a681d; }
  .dash-badge.quiet { background: #e5f0f4; color: #145b78; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: #17252d; color: #f4f6f5; text-decoration: none; font-size: 0.78rem; font-weight: 700; white-space: nowrap; transition: background 0.14s ease; }
  .dash-cta:hover { background: #294a5a; }
  .dash-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #dbe3e7; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
  .dash-metrics > div { background: #fdfcf9; padding: 18px 20px; }
  .dash-metrics span:first-child { display: block; color: #71818a; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin-bottom: 8px; }
  .dash-metrics strong { display: block; font-size: 1.7rem; letter-spacing: -0.04em; line-height: 1.1; color: #1b2b36; }
  .dash-metrics strong em { font-style: normal; font-size: 1rem; color: #71818a; letter-spacing: 0; }
  .dash-metrics small { display: block; color: #71818a; font-size: 0.7rem; margin-top: 5px; }
  .dash-track { height: 5px; background: #dbe3e7; border-radius: 3px; margin-top: 9px; overflow: hidden; }
  .dash-track i { display: block; height: 100%; background: #145b78; border-radius: 3px; }
  .status-badge { display: inline-block; padding: 6px 10px; border-radius: 5px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.02em; }
  .status-badge.draft { background: #f4eddd; color: #8a681d; }
  .status-badge.submitted { background: #e5f0f4; color: #145b78; }
  .status-badge.approved { background: #e4f1eb; color: #24745b; }
  .status-badge.changes { background: #f4eddd; color: #8a681d; }
  .dash-bottom { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
  .teaching-panel { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #dbe3e7; }
  .panel-head h2 { font-size: 0.9rem; margin: 0; letter-spacing: -0.01em; }
  .panel-head a { color: #145b78; text-decoration: none; font-size: 0.73rem; font-weight: 700; }
  .course-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid #e8eeec; }
  .course-row:last-child { border-bottom: 0; }
  .course-info { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; align-items: center; min-width: 0; flex: 1; }
  .course-code { grid-row: 1; font-size: 0.78rem; color: #145b78; font-weight: 800; letter-spacing: 0.02em; }
  .course-name { grid-row: 1; font-size: 0.82rem; color: #1b2b36; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .course-type { grid-row: 2; grid-column: 2; font-size: 0.66rem; color: #87969c; }
  .course-stats { display: flex; gap: 16px; flex: none; }
  .course-stats > div { text-align: right; }
  .course-stats span { display: block; font-size: 0.62rem; color: #87969c; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; margin-bottom: 2px; }
  .course-stats strong { font-size: 0.82rem; color: #1b2b36; }
  .course-stats strong em { font-style: normal; font-size: 0.7rem; color: #87969c; }
  .course-bar { width: 80px; flex: none; }
  .cbar-track { height: 4px; background: #dbe3e7; border-radius: 2px; overflow: hidden; }
  .cbar-fill { display: block; height: 100%; background: #145b78; border-radius: 2px; }
  .course-mark { width: 20px; text-align: center; font-size: 0.85rem; font-weight: 800; flex: none; }
  .course-mark.ok { color: #24745b; }
  .course-mark.mid { color: #b48632; }
  .course-mark.low { color: #a84f42; }
  .teaching-empty { padding: 32px 20px; text-align: center; color: #87969c; font-size: 0.8rem; }
  .side-stack { display: grid; gap: 16px; position: sticky; top: 20px; }
  .side-card { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .attn-row { display: flex; gap: 13px; padding: 16px 18px; align-items: start; }
  .attn-icon { width: 23px; height: 23px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 0.72rem; flex: none; margin-top: 1px; }
  .attn-icon.warn { background: #f4eddd; color: #8a681d; }
  .attn-icon.info { background: #e5f0f4; color: #145b78; }
  .attn-icon.ok { background: #e4f1eb; color: #24745b; }
  .attn-row strong { display: block; font-size: 0.8rem; margin-bottom: 2px; }
  .attn-row p { margin: 0 0 5px; color: #667477; font-size: 0.74rem; line-height: 1.4; }
  .attn-row a { color: #145b78; text-decoration: none; font-weight: 700; font-size: 0.74rem; }
  .hist-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; text-decoration: none; border-bottom: 1px solid #e8eeec; transition: background 0.1s ease; }
  .hist-row:last-child { border-bottom: 0; }
  .hist-row:hover { background: #f4f6f5; }
  .hist-row strong { font-size: 0.78rem; color: #1b2b36; }
  .hist-pill { font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; }
  .hist-draft { background: #f4eddd; color: #8a681d; }
  .hist-sub { background: #e5f0f4; color: #145b78; }
  .hist-ok { background: #e4f1eb; color: #24745b; }
  .hist-chg { background: #f4eddd; color: #8a681d; }
  .hist-empty { padding: 24px 18px; text-align: center; color: #87969c; font-size: 0.78rem; }
  @media (max-width: 900px) {
    .dash-bottom { grid-template-columns: 1fr; }
    .side-stack { position: static; }
  }
  @media (max-width: 800px) {
    .dash-header { flex-direction: column; align-items: start; }
    .dash-metrics { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .course-row { flex-wrap: wrap; }
    .course-bar { display: none; }
  }
  @media (max-width: 500px) {
    .dash-metrics { grid-template-columns: 1fr; }
    .dash-actions { flex-wrap: wrap; }
  }
</style>