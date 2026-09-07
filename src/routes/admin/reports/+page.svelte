<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import ReportPreview from '$lib/components/ReportPreview.svelte';
  type ReviewRow = { id: string; status: string; updated_at: string; completion: number; faculty_name: string; period_label: string };
  type TeachingRow = { course_code: string; course_name: string; program_level: string; class_type: string; scheduled: number; conducted: number; missed: number; missed_action: string; syllabus_completion: number };
  type ResearchRow = { category: string; title: string; venue_or_agency: string; status: string };
  type DutyRow = { name: string; role: string; activity: string };
  type OutreachRow = { activity: string; audience: string; date: string };
  type AttachRow = { id: string; filename: string; size: number };
  type ReviewHistoryRow = { decision: string; remarks: string; created_at: string; reviewer_name: string };
  let reports: ReviewRow[] = $state([]);
  let selected: ReviewRow | null = $state(null);
  let comment = $state('');
  let error = $state('');
  let reason = $state('');
  let allowedUntil = $state('');
  let loading = $state(true);
  let reviewBusy: 'APPROVED' | 'CHANGES_REQUIRED' | null = $state(null);
  let reportContent: {
    teaching: TeachingRow[];
    research: ResearchRow[];
    duties: DutyRow[];
    outreach: OutreachRow[];
    attachments: AttachRow[];
    summary: string;
    reviews: ReviewHistoryRow[];
  } | null = $state(null);
  let contentLoading = $state(false);
  let showReport = $state(false);
  let search = $state('');
  const visibleReports = $derived(
    search.trim() ? reports.filter((r) => (r.faculty_name + ' ' + r.period_label).toLowerCase().includes(search.trim().toLowerCase())) : reports,
  );
  onMount(async () => {
    try {
      const res = await fetch('/api/reviews');
      const d = await res.json();
      reports = d.reports ?? [];
      selected = reports[0] ?? null;
      if (selected) loadContent(selected.id);
    } catch { error = 'Unable to load reviews.'; }
    finally { loading = false; }
  });
  async function loadContent(reportId: string) {
    contentLoading = true; reportContent = null;
    try {
      const [repRes, attRes] = await Promise.all([
        fetch(`/api/reports/${reportId}`),
        fetch(`/api/attachments?reportId=${reportId}`),
      ]);
      const d = await repRes.json();
      const ad = await attRes.json().catch(() => ({}));
      reportContent = {
        teaching: d.teaching ?? [],
        research: d.research ?? [],
        duties: d.duties ?? [],
        outreach: d.outreach ?? [],
        attachments: ad.attachments ?? [],
        summary: d.report?.summary ?? '',
        reviews: d.reviews ?? [],
      };
    }
    catch { reportContent = null; error = 'Could not load report content.'; }
    finally { contentLoading = false; }
  }
  async function review(next: 'APPROVED' | 'CHANGES_REQUIRED') {
    if (!selected || reviewBusy) return;
    error = '';
    if (next === 'CHANGES_REQUIRED' && !comment.trim()) {
      error = 'Add remarks explaining what needs to change.';
      return;
    }
    reviewBusy = next;
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId: selected.id, decision: next, remarks: comment }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { error = d.error ?? 'Unable to save review.'; return; }
      show('Review saved.');
      selected = { ...selected, status: next };
      reports = reports.map(r => r.id === selected?.id ? { ...r, status: next } : r);
      loadContent(selected.id);
    } finally { reviewBusy = null; }
  }
  async function reopen() {
    if (!selected) return; error = '';
    const res = await fetch('/api/exceptions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId: selected.id, reason, allowedUntil }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { error = d.error ?? 'Unable to reopen report.'; return; }
    show('Report reopened for editing.');
  }
  function selectReport(r: ReviewRow) { selected = r; comment = ''; error = ''; showReport = false; loadContent(r.id); }
  function pillClass(s: string) { return s === 'SUBMITTED' ? 'r-sub' : s === 'APPROVED' ? 'r-ok' : 'r-chg'; }
  function pillLabel(s: string) { return s === 'CHANGES_REQUIRED' ? 'Changes required' : s[0] + s.slice(1).toLowerCase(); }
</script>

<svelte:head><title>Review queue · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <header class="dash-header">
    <div>
      <h1>Review queue</h1>
      <span class="dash-period">{reports.length} report{reports.length === 1 ? '' : 's'}</span>
    </div>
    <div class="dash-actions">
      <NotificationBell />
      <a class="act-link" href="/api/reviews?format=csv" target="_blank">CSV</a>
      {#if selected}<a class="act-link" href="/api/reports/{selected.id}/pdf" target="_blank">PDF</a>{/if}
    </div>
  </header>
  {#if error}<div class="msg err">{error}</div>{/if}
  {#if loading}
    <div class="dash-loading"><span class="spinner"></span><span>Loading…</span></div>
  {:else}
    <div class="review-layout">
      <section class="queue-panel">
        <div class="queue-head">Reports requiring attention</div>
        {#if reports.length}
          <input class="q-search" type="search" placeholder="Search faculty or period…" aria-label="Filter reports by faculty or period" bind:value={search} />
        {/if}
        {#if !visibleReports.length}
          <div class="q-empty">{reports.length ? 'No reports match your search.' : 'No submitted reports available yet.'}</div>
        {:else}
          {#each visibleReports as r}
            <button class="q-row" class:chosen={selected?.id === r.id} onclick={() => selectReport(r)}>
              <div class="q-info">
                <strong>{r.faculty_name}</strong>
                <small>{r.period_label} — Updated {new Date(r.updated_at).toLocaleDateString()}</small>
              </div>
              <span class="report-pill {pillClass(r.status)}">{pillLabel(r.status)}</span>
            </button>
          {/each}
        {/if}
      </section>
      {#if selected}
        <section class="review-panel">
          <div class="rp-head">
            <div class="rp-head-info">
              <h2>{selected.faculty_name}</h2>
              <span class="rp-head-meta">{selected.period_label} · Updated {new Date(selected.updated_at).toLocaleDateString()}</span>
            </div>
            <span class="report-pill {pillClass(selected.status)}">{pillLabel(selected.status)}</span>
          </div>
          <div class="rp-tabs">
            <button class:active={!showReport} onclick={() => (showReport = false)}>Review</button>
            <button class:active={showReport} onclick={() => (showReport = true)}>Report content</button>
          </div>
          {#if !showReport}
            <div class="rp-body">
              {#if reportContent?.reviews?.length}
                <div class="rp-reviews">
                  <h3>Review history</h3>
                  {#each reportContent.reviews as rv}
                    <div class="rp-rv-row">
                      <span class="report-pill" class:r-ok={rv.decision === 'APPROVED'} class:r-chg={rv.decision === 'CHANGES_REQUIRED'}>{rv.decision === 'APPROVED' ? 'Approved' : 'Changes'}</span>
                      <span class="rv-text"><strong>{rv.reviewer_name}</strong>{rv.remarks ? ` — ${rv.remarks}` : ''}</span>
                    </div>
                  {/each}
                </div>
              {/if}
              <label class="rp-label" for="review-remarks">Reviewer remarks</label>
              <textarea id="review-remarks" class="rp-textarea" bind:value={comment} rows="4" placeholder="Record feedback for the faculty member…"></textarea>
              <div class="rp-btns">
                <button class="btn-approve" disabled={reviewBusy !== null} onclick={() => review('APPROVED')}>{reviewBusy === 'APPROVED' ? 'Approving…' : 'Approve'}</button>
                <button class="btn-changes" disabled={reviewBusy !== null} onclick={() => review('CHANGES_REQUIRED')}>{reviewBusy === 'CHANGES_REQUIRED' ? 'Sending…' : 'Request changes'}</button>
              </div>
              <details class="rp-reopen">
                <summary>Reopen report for editing</summary>
                <div class="rp-reopen-body">
                  <label>Reason<input bind:value={reason} placeholder="Why is this being reopened?" /></label>
                  <label>Allow editing until<input type="date" bind:value={allowedUntil} /></label>
                  <button class="act-link" onclick={reopen}>Reopen</button>
                </div>
              </details>
            </div>
          {:else}
            <div class="rp-body">
              {#if contentLoading}
                <div class="dash-loading"><span class="spinner"></span></div>
              {:else if !reportContent}
                <div class="empty-state">Could not load report content.</div>
              {:else}
                <ReportPreview
                  kicker="Faculty weekly report · {selected.period_label}"
                  teaching={reportContent.teaching.map((t) => ({
                    title: t.course_code || 'Untitled',
                    sub: t.course_name || 'Course name pending',
                    meta: `${t.conducted} / ${t.scheduled} classes`,
                  }))}
                  research={reportContent.research
                    .filter((r) => (r.title ?? '').trim() && r.title !== 'N/A')
                    .map((r) => ({
                      title: r.title || 'Untitled',
                      sub: r.category,
                      meta: `${r.status || '—'}${r.venue_or_agency ? ` · ${r.venue_or_agency}` : ''}`,
                    }))}
                  duties={reportContent.duties
                    .filter((d) => (d.name ?? '').trim() && d.name !== 'N/A')
                    .map((d) => ({ title: d.name || 'Untitled', sub: d.role, meta: d.activity }))}
                  outreach={reportContent.outreach
                    .filter((o) => (o.activity ?? '').trim() && o.activity !== 'N/A')
                    .map((o) => ({ title: o.activity || 'Untitled', sub: o.audience, meta: o.date }))}
                  summary={reportContent.summary}
                />
                {#if reportContent.attachments.length}
                  <h3>Supporting files ({reportContent.attachments.length})</h3>
                  <div class="attach-list">
                    {#each reportContent.attachments as a}
                      <div class="attach-row">
                        <span class="attach-name">{a.filename}</span>
                        <a class="act-link" href="/api/attachments/{a.id}" download>Download</a>
                      </div>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        </section>
      {/if}
    </div>
  {/if}
</main>

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 24px; color: var(--muted-3); font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px 24px; box-shadow: var(--shadow-sm); }
  .dash-header h1 { font-size: 1.55rem; letter-spacing: -0.03em; margin: 0 0 4px; font-weight: 750; color: var(--text-1); }
  .dash-period { font-size: 0.84rem; color: var(--text-3); }
  .dash-actions { display: flex; align-items: center; gap: 8px; }
  .act-link { border: 1px solid var(--line); border-radius: 7px; padding: 8px 13px; background: var(--panel); color: var(--accent-strong); font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; box-shadow: var(--shadow-xs); transition: all 0.12s; }
  .act-link:hover { background: var(--bg-hover); border-color: var(--blue-border); box-shadow: var(--shadow-sm); }
  .msg.err { padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 0.8rem; background: var(--red-bg-alt); border: 1px solid var(--red-border); color: var(--red-dark); box-shadow: var(--shadow-xs); }
  .report-pill { flex: none; font-size: 0.66rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.02em; white-space: nowrap; border: 1px solid transparent; }
  .r-sub { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .r-ok { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .r-chg { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .review-layout { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
  .queue-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); }
  .queue-head { padding: 15px 18px; border-bottom: 1px solid var(--line); background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent); color: var(--text-3); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
  .q-row { width: 100%; display: flex; justify-content: space-between; gap: 10px; align-items: center; text-align: left; border: 0; border-bottom: 1px solid var(--line-2); border-left: 3px solid transparent; background: transparent; padding: 14px 15px 14px 16px; cursor: pointer; font: inherit; color: var(--ink-2); transition: background 0.1s, border-color 0.1s; }
  .q-row:last-child { border-bottom: 0; }
  .q-row:hover { background: #f6f9fc; }
  .q-row.chosen { background: #eff4fb; border-left-color: var(--accent); }
  .q-info strong, .q-info small { display: block; }
  .q-info strong { font-size: 0.82rem; }
  .q-info small { color: var(--muted-2); margin-top: 3px; font-size: 0.72rem; }
  .q-empty { padding: 24px 16px; color: var(--muted-2); font-size: 0.8rem; }
  .q-search { width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid var(--line); padding: 11px 16px; font: inherit; font-size: 0.78rem; background: var(--bg-input); color: var(--ink-2); outline: none; }
  .q-search:focus { box-shadow: inset 0 -2px 0 var(--blue); }
  .q-search::placeholder { color: var(--muted-3); }
  .review-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); }
  .rp-head { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: 20px 22px; border-bottom: 1px solid var(--line); background: linear-gradient(to bottom, rgba(248,250,252,0.6), transparent); }
  .rp-head-info h2 { font-size: 1.15rem; letter-spacing: -0.02em; margin: 0 0 2px; font-weight: 750; color: var(--text-1); }
  .rp-head-meta { font-size: 0.8rem; color: var(--text-3); }
  .rp-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); padding: 0 12px; background: var(--panel); }
  .rp-tabs button { border: 0; background: transparent; padding: 12px 18px; font: inherit; font-size: 0.8rem; font-weight: 600; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.12s; }
  .rp-tabs button:hover { color: var(--accent-strong); }
  .rp-tabs button.active { color: var(--blue-dark); font-weight: 750; border-bottom-color: var(--accent); }
  .rp-body { padding: 22px; }
  .rp-label { display: block; font-size: 0.76rem; font-weight: 700; color: var(--text-3); margin-bottom: 6px; }
  .rp-reviews { margin-bottom: 18px; }
  .rp-reviews h3, .rp-body h3 { font-size: 0.8rem; margin: 0 0 10px; color: var(--ink-2); }
  .rp-rv-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line-2); font-size: 0.8rem; }
  .rp-rv-row:last-child { border-bottom: 0; }
  .rv-text { color: var(--muted); font-size: 0.78rem; }
  .rv-text strong { color: var(--ink-2); }
  .rp-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 8px; padding: 11px 13px; font: inherit; font-size: 0.84rem; background: var(--bg-input); color: var(--text-1); resize: vertical; margin-bottom: 14px; box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .rp-textarea:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .rp-btns { display: flex; gap: 10px; margin-bottom: 18px; }
  .btn-approve, .btn-changes { border: 1px solid transparent; border-radius: 8px; padding: 10px 18px; font: inherit; font-size: 0.8rem; font-weight: 750; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.12s; }
  .btn-approve:disabled, .btn-changes:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .btn-approve { background: var(--navy); border-color: var(--navy); color: var(--paper); }
  .btn-approve:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .btn-changes { background: var(--red-bg-alt); border-color: var(--red-border); color: var(--red-dark); }
  .btn-changes:hover { background: var(--red-bg); box-shadow: var(--shadow-sm); }
  .rp-reopen summary { cursor: pointer; font-size: 0.76rem; color: var(--muted); padding: 6px 0; }
  .rp-reopen-body { display: grid; gap: 10px; padding: 12px 0; }
  .rp-reopen-body label { font-size: 0.72rem; font-weight: 700; color: var(--muted); }
  .rp-reopen-body input { border: 1px solid var(--line); border-radius: 5px; padding: 8px 10px; font: inherit; background: var(--bg-input); width: 100%; box-sizing: border-box; margin-top: 4px; }
  .rp-reopen-body .act-link { align-self: start; }
  .summary-block { background: var(--paper); border-radius: 6px; padding: 14px; font-size: 0.82rem; line-height: 1.55; color: var(--ink-2); white-space: pre-wrap; }
  .attach-list { display: grid; gap: 8px; margin-top: 4px; }
  .attach-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 7px; }
  .attach-name { flex: 1; min-width: 0; font-size: 0.78rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty-state { color: var(--muted-2); font-size: 0.78rem; padding: 10px 0; }
  @media (max-width: 800px) { .review-layout { grid-template-columns: 1fr; } }
  @media (max-width: 520px) { .rp-btns { flex-direction: column; } }
</style>