<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  type ReviewRow = { id: string; status: string; updated_at: string; completion: number; faculty_name: string; period_label: string };
  type TeachingRow = { course_code: string; course_name: string; program_level: string; class_type: string; scheduled: number; conducted: number; missed: number; missed_action: string; syllabus_completion: number };
  type ReviewHistoryRow = { decision: string; remarks: string; created_at: string; reviewer_name: string };
  let reports: ReviewRow[] = $state([]);
  let selected: ReviewRow | null = $state(null);
  let comment = $state('');
  let error = $state('');
  let reason = $state('');
  let allowedUntil = $state('');
  let loading = $state(true);
  let reportContent: { teaching: TeachingRow[]; summary: string; reviews: ReviewHistoryRow[] } | null = $state(null);
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
    try { const res = await fetch(`/api/reports/${reportId}`); const d = await res.json(); reportContent = { teaching: d.teaching ?? [], summary: d.report?.summary ?? '', reviews: d.reviews ?? [] }; }
    catch { reportContent = null; error = 'Could not load report content.'; }
    finally { contentLoading = false; }
  }
  async function review(next: 'APPROVED' | 'CHANGES_REQUIRED') {
    if (!selected) return; error = '';
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId: selected.id, decision: next, remarks: comment }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { error = d.error ?? 'Unable to save review.'; return; }
    show('Review saved.');
    selected = { ...selected, status: next };
    reports = reports.map(r => r.id === selected?.id ? { ...r, status: next } : r);
    loadContent(selected.id);
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
                <button class="btn-approve" onclick={() => review('APPROVED')}>Approve</button>
                <button class="btn-changes" onclick={() => review('CHANGES_REQUIRED')}>Request changes</button>
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
                <h3>Teaching & academic delivery</h3>
                {#if !reportContent.teaching.length}
                  <p class="empty-state">No teaching records found.</p>
                {:else}
                  <div class="content-table-wrap">
                    <table>
                      <thead><tr><th>Course</th><th>Name</th><th>Program</th><th>Type</th><th>Sched.</th><th>Cond.</th><th>Missed</th><th>Syllabus</th></tr></thead>
                      <tbody>
                        {#each reportContent.teaching as t}
                          <tr><td>{t.course_code}</td><td>{t.course_name}</td><td>{t.program_level}</td><td>{t.class_type}</td><td>{t.scheduled}</td><td>{t.conducted}</td><td>{t.missed}{t.missed_action ? ` (${t.missed_action})` : ''}</td><td>{t.syllabus_completion ?? '-'}%</td></tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
                <h3>Weekly summary</h3>
                {#if reportContent.summary}
                  <div class="summary-block">{reportContent.summary}</div>
                {:else}
                  <p class="empty-state">No summary entered.</p>
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
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: var(--muted); }
  .dash-actions { display: flex; align-items: center; gap: 8px; }
  .act-link { border: 1px solid var(--line); border-radius: 6px; padding: 7px 12px; background: var(--panel); color: var(--blue); font: inherit; font-size: 0.73rem; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; transition: all 0.12s; }
  .act-link:hover { background: var(--bg-hover); border-color: var(--blue-border); }
  .msg.err { padding: 11px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 0.78rem; background: var(--red-bg); color: var(--red); }
  .report-pill { flex: none; font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; letter-spacing: 0.02em; white-space: nowrap; }
  .r-sub { background: var(--blue-soft); color: var(--blue-dark); }
  .r-ok { background: var(--green-soft); color: var(--green); }
  .r-chg { background: var(--red-soft); color: var(--red-dark); }
  .review-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
  .queue-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .queue-head { padding: 14px 16px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
  .q-row { width: 100%; display: flex; justify-content: space-between; gap: 10px; align-items: center; text-align: left; border: 0; border-bottom: 1px solid var(--line-2); background: transparent; padding: 14px 16px; cursor: pointer; font: inherit; color: var(--ink-2); transition: background 0.1s; }
  .q-row:last-child { border-bottom: 0; }
  .q-row:hover { background: var(--paper); }
  .q-row.chosen { background: var(--bg-hover); }
  .q-info strong, .q-info small { display: block; }
  .q-info small { color: var(--muted-2); margin-top: 3px; font-size: 0.7rem; }
  .q-empty { padding: 24px 16px; color: var(--muted-2); font-size: 0.8rem; }
  .q-search { width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid var(--line); padding: 11px 16px; font: inherit; font-size: 0.78rem; background: var(--bg-input); color: var(--ink-2); outline: none; }
  .q-search:focus { box-shadow: inset 0 -2px 0 var(--blue); }
  .q-search::placeholder { color: var(--muted-3); }
  .review-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .rp-head { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
  .rp-head-info h2 { font-size: 1.1rem; letter-spacing: -0.02em; margin: 0; }
  .rp-head-meta { font-size: 0.78rem; color: var(--muted); }
  .rp-tabs { display: flex; border-bottom: 1px solid var(--line); }
  .rp-tabs button { border: 0; background: 0; padding: 10px 18px; font: inherit; font-size: 0.78rem; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.12s; }
  .rp-tabs button.active { color: var(--blue); font-weight: 700; border-bottom-color: var(--blue); }
  .rp-body { padding: 20px; }
  .rp-label { display: block; font-size: 0.74rem; font-weight: 700; color: var(--muted); margin-bottom: 6px; }
  .rp-reviews { margin-bottom: 18px; }
  .rp-reviews h3, .rp-body h3 { font-size: 0.8rem; margin: 0 0 10px; color: var(--ink-2); }
  .rp-rv-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line-2); font-size: 0.8rem; }
  .rp-rv-row:last-child { border-bottom: 0; }
  .rv-text { color: var(--muted); font-size: 0.78rem; }
  .rv-text strong { color: var(--ink-2); }
  .rp-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 6px; padding: 10px; font: inherit; background: var(--bg-input); resize: vertical; margin-bottom: 14px; }
  .rp-btns { display: flex; gap: 10px; margin-bottom: 18px; }
  .btn-approve, .btn-changes { border: 0; border-radius: 6px; padding: 9px 16px; font: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: background 0.12s; }
  .btn-approve { background: var(--navy); color: var(--paper); }
  .btn-approve:hover { background: var(--blue-hover); }
  .btn-changes { background: var(--red-soft); color: var(--red-dark); }
  .btn-changes:hover { background: var(--red-soft); }
  .rp-reopen summary { cursor: pointer; font-size: 0.76rem; color: var(--muted); padding: 6px 0; }
  .rp-reopen-body { display: grid; gap: 10px; padding: 12px 0; }
  .rp-reopen-body label { font-size: 0.72rem; font-weight: 700; color: var(--muted); }
  .rp-reopen-body input { border: 1px solid var(--line); border-radius: 5px; padding: 8px 10px; font: inherit; background: var(--bg-input); width: 100%; box-sizing: border-box; margin-top: 4px; }
  .rp-reopen-body .act-link { align-self: start; }
  .content-table-wrap { overflow-x: auto; margin-bottom: 18px; }
  .content-table-wrap table { width: 100%; border-collapse: collapse; font-size: 0.76rem; }
  .content-table-wrap th { text-align: left; padding: 8px; border-bottom: 1px solid var(--line); color: var(--muted); font-weight: 700; white-space: nowrap; }
  .content-table-wrap td { padding: 8px; border-bottom: 1px solid var(--line-2); color: var(--ink-2); }
  .content-table-wrap tr:last-child td { border-bottom: 0; }
  .summary-block { background: var(--paper); border-radius: 6px; padding: 14px; font-size: 0.82rem; line-height: 1.55; color: var(--ink-2); white-space: pre-wrap; }
  .empty-state { color: var(--muted-2); font-size: 0.78rem; padding: 10px 0; }
  @media (max-width: 800px) { .review-layout { grid-template-columns: 1fr; } }
  @media (max-width: 520px) { .rp-btns { flex-direction: column; } }
</style>