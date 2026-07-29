<script lang="ts">
  import { onMount } from 'svelte';
  type ReviewRow = { id: string; status: string; updated_at: string; completion: number; faculty_name: string; period_label: string };
  type TeachingRow = { course_code: string; course_name: string; program_level: string; class_type: string; scheduled: number; conducted: number; missed: number; missed_action: string; syllabus_completion: number };
  type ReviewHistoryRow = { decision: string; remarks: string; created_at: string; reviewer_name: string };
  let reports: ReviewRow[] = $state([]);
  let selected: ReviewRow | null = $state(null);
  let decision = $state('');
  let comment = $state('');
  let error = $state('');
  let saved = $state('');
  let reason = $state('');
  let allowedUntil = $state('');
  let loading = $state(true);
  let reportContent: { teaching: TeachingRow[]; summary: string; reviews: ReviewHistoryRow[] } | null = $state(null);
  let contentLoading = $state(false);
  let showReport = $state(false);
  onMount(async () => {
    try { const response = await fetch('/api/reviews'); const data = await response.json(); reports = data.reports ?? []; selected = reports[0] ?? null; if (selected) loadContent(selected.id); }
    catch { error = 'Unable to load reviews.'; }
    finally { loading = false; }
  });
  async function loadContent(reportId: string) {
    contentLoading = true; reportContent = null;
    try { const res = await fetch(`/api/reports/${reportId}`); const d = await res.json(); reportContent = { teaching: d.teaching ?? [], summary: d.report?.summary ?? '', reviews: d.reviews ?? [] }; } catch {} finally { contentLoading = false; }
  }
  async function review(next: 'APPROVED' | 'CHANGES_REQUIRED') {
    if (!selected) return; error = ''; saved = '';
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId: selected.id, decision: next, remarks: comment }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) error = data.error ?? 'Unable to save review.';
    else { saved = 'Review decision saved'; selected = { ...selected, status: next }; reports = reports.map((row) => row.id === selected?.id ? { ...row, status: next } : row); loadContent(selected.id); }
  }
  async function reopen() {
    if (!selected) return; error = ''; saved = '';
    const response = await fetch('/api/exceptions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId: selected.id, reason, allowedUntil }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) error = data.error ?? 'Unable to reopen report.'; else saved = 'Report reopened for editing';
  }
  function selectReport(report: ReviewRow) { selected = report; decision = ''; saved = ''; error = ''; showReport = false; loadContent(report.id); }
</script>
<svelte:head><title>Review queue · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell review-shell">
  {#if loading}
    <div class="loading-panel"><span class="spinner"></span><span>Loading review queue…</span></div>
  {:else}
    <div class="breadcrumb">Administration <span>/</span> Review queue</div>
    <div class="page-heading">
      <div><h1>Review queue</h1><p>Review submitted weekly reports for the assigned department.</p></div>
      <span class="period-chip">{reports.length} report{reports.length === 1 ? '' : 's'}</span>
    </div>
    <div class="review-layout">
      <section class="queue">
        <div class="queue-heading">Reports requiring attention</div>
        {#if !reports.length}<div class="queue-empty">No submitted reports are available yet.</div>{/if}
        {#each reports as report}
          <button class:chosen={selected?.id === report.id} onclick={() => selectReport(report)}>
            <span><strong>{report.faculty_name}</strong><small>{report.period_label} · Updated {new Date(report.updated_at).toLocaleDateString()}</small></span>
            <span class="status {report.status === 'SUBMITTED' ? 'submitted' : report.status === 'APPROVED' ? 'approved' : 'changes'}">{report.status === 'CHANGES_REQUIRED' ? 'Changes required' : report.status[0] + report.status.slice(1).toLowerCase()}</span>
          </button>
        {/each}
      </section>
      {#if selected}
        <section class="review-panel">
          <div class="review-panel-head">
            <div>
              <div class="eyebrow">Selected report</div>
              <h2>{selected.faculty_name}</h2>
              <p>{selected.period_label} · {selected.completion}% complete</p>
            </div>
            <span class="status submitted">{selected.status}</span>
          </div>
          <div class="review-metrics">
            <div><small>Report status</small><strong>{selected.status}</strong></div>
            <div><small>Last updated</small><strong>{new Date(selected.updated_at).toLocaleDateString()}</strong></div>
            <div><small>Completion</small><strong>{selected.completion}%</strong></div>
          </div>
          <div class="report-tabs"><button class:active={!showReport} onclick={() => showReport = false}>Review actions</button><button class:active={showReport} onclick={() => showReport = true}>Report content</button></div>
          {#if !showReport}
            <div class="review-actions-panel">
              {#if reportContent?.reviews?.length}
                <div class="review-history"><h3>Review history</h3>{#each reportContent.reviews as rv}<div class="review-entry"><span class="status {rv.decision === 'APPROVED' ? 'approved' : 'changes'}">{rv.decision === 'APPROVED' ? 'Approved' : 'Changes requested'}</span><div><strong>{rv.reviewer_name}</strong><small>{new Date(rv.created_at).toLocaleString()}{rv.remarks ? ` · ${rv.remarks}` : ''}</small></div></div>{/each}</div>
              {/if}
              <h3>Reviewer remarks</h3>
              <textarea bind:value={comment} rows="5" placeholder="Record action points or feedback for the faculty member."></textarea>
              {#if error}<div class="decision-note error-note">{error}</div>{/if}
              {#if saved}<div class="decision-note saved-note">{saved}</div>{/if}
              <div class="review-actions">
                <button class="button approve" onclick={() => review('APPROVED')}><span>✓</span> Approve</button>
                <button class="button changes" onclick={() => review('CHANGES_REQUIRED')}><span>↩</span> Request changes</button>
              </div>
              <details class="reopen-details"><summary>Reopen report for editing</summary><div><span class="eyebrow">Reason for reopening</span><input bind:value={reason} placeholder="Why is this being reopened?" /><span class="eyebrow">Allow editing until</span><input type="date" bind:value={allowedUntil} /><button class="button" onclick={reopen}>Reopen report</button></div></details>
            </div>
          {:else}
            <div class="report-content-panel">
              {#if contentLoading}<div class="loading-inline"><span class="spinner"></span></div>{:else if !reportContent}<div class="empty-state">Could not load report content.</div>{:else}
                <h3>Teaching & academic delivery</h3>
                {#if !reportContent.teaching.length}<p class="empty-section">No teaching records found.</p>{:else}<div class="content-table"><table><thead><tr><th>Course</th><th>Name</th><th>Program</th><th>Type</th><th>Scheduled</th><th>Conducted</th><th>Missed</th><th>Syllabus</th></tr></thead><tbody>{#each reportContent.teaching as t}<tr><td>{t.course_code}</td><td>{t.course_name}</td><td>{t.program_level}</td><td>{t.class_type}</td><td>{t.scheduled}</td><td>{t.conducted}</td><td>{t.missed}{t.missed_action ? ` (${t.missed_action})` : ''}</td><td>{t.syllabus_completion ?? '—'}%</td></tr>{/each}</tbody></table></div>{/if}
                <h3>Weekly summary</h3>
                {#if reportContent.summary}<div class="summary-block">{reportContent.summary}</div>{:else}<em class="empty-section">No summary entered.</em>{/if}
              {/if}
            </div>
          {/if}
        </section>
      {/if}
    </div>
  {/if}
</main>
<style>
  .breadcrumb{font-size:.73rem;color:#71818a;margin-bottom:8px}.breadcrumb span{padding:0 8px;color:#b2bdc1}.loading-panel,.loading-inline{display:flex;align-items:center;gap:12px;padding:24px;color:#71818a;font-size:.88rem}.spinner{width:18px;height:18px;border:2px solid #dbe3e7;border-top-color:#087f73;border-radius:50%;animation:spin .6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.review-layout{display:grid;grid-template-columns:300px 1fr;gap:18px}.queue{border:1px solid #dbe3e7;background:#fdfcf9;border-radius:7px;overflow:hidden}.queue-heading{padding:15px 16px;border-bottom:1px solid #dbe3e7;color:#61727d;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.queue button{width:100%;display:flex;justify-content:space-between;gap:10px;align-items:center;text-align:left;border:0;border-bottom:1px solid #e6ecee;background:transparent;padding:16px;cursor:pointer;font:inherit;color:#1b2b36}.queue button:last-child{border-bottom:0}.queue button.chosen{background:#edf3f5}.queue strong,.queue small{display:block}.queue small{color:#71818a;margin-top:4px;font-size:.72rem}.queue-empty{padding:25px 16px;color:#71818a;font-size:.8rem}.status{white-space:nowrap;border-radius:3px;padding:4px 8px;font-size:.65rem;font-weight:800}.submitted{background:#e6f0f4;color:#3a7083}.approved{background:#e4f3ef;color:#167166}.changes{background:#fff2d9;color:#896015}.review-panel{background:#fdfcf9;border:1px solid #dbe3e7;border-radius:7px;padding:24px}.review-panel-head{display:flex;justify-content:space-between;gap:15px}.review-panel h2{font-size:1.55rem;letter-spacing:-.035em;margin:8px 0 3px}.review-panel p{color:#71818a;margin:0}.review-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;border-block:1px solid #dbe3e7;margin:20px 0;padding:14px 0}.review-metrics small{display:block;color:#71818a;font-size:.7rem}.review-metrics strong{display:block;font-size:1.05rem;margin-top:5px}.report-tabs{display:flex;gap:0;border-bottom:1px solid #dbe3e7;margin-bottom:18px}.report-tabs button{border:0;background:0;padding:10px 18px;font:inherit;font-size:.82rem;color:#61727d;cursor:pointer;border-bottom:2px solid transparent;transition:all .12s}.report-tabs button.active{color:#087f73;font-weight:750;border-bottom-color:#087f73}.report-content-panel h3,.review-actions-panel h3{font-size:.82rem;margin:18px 0 10px;color:#1b2b36}.review-history{margin-bottom:18px}.review-entry{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #eef3f5;font-size:.82rem}.review-entry strong{display:block;font-size:.8rem}.review-entry small{color:#71818a;font-size:.7rem}.review-entry .status{flex:none}.review-panel textarea{width:100%;border:1px solid #cbd7de;border-radius:6px;padding:11px;font:inherit;background:#fbfcfc;resize:vertical;margin-bottom:14px}.decision-note{padding:10px 14px;border-radius:5px;font-size:.82rem;margin-bottom:14px}.error-note{background:#f9e9e7;color:#8f413b}.saved-note{background:#e4f3ef;color:#167166}.review-actions{display:flex;gap:10px;margin-bottom:18px}.review-actions .button{display:flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:6px;font:inherit;font-size:.8rem;font-weight:750;cursor:pointer;transition:background .12s}.button.approve{background:#087f73;color:#f5f4ef}.button.approve:hover{background:#0a9688}.button.changes{background:#f7ead2;color:#97651b}.button.changes:hover{background:#f3dfb8}.reopen-details summary{cursor:pointer;font-size:.78rem;color:#61727d;padding:6px 0}.reopen-details>div{display:grid;gap:8px;padding:10px 0}.reopen-details input{border:1px solid #cbd7de;border-radius:5px;padding:9px;font:inherit;background:#fbfcfc}.reopen-details .eyebrow{font-size:.66rem;color:#71818a;text-transform:uppercase;letter-spacing:.08em;font-weight:800;margin-top:4px}.content-table{overflow-x:auto;margin-bottom:18px}.content-table table{width:100%;border-collapse:collapse;font-size:.78rem}.content-table th{text-align:left;padding:9px 8px;border-bottom:1px solid #dbe3e7;color:#61727d;font-weight:700;white-space:nowrap}.content-table td{padding:9px 8px;border-bottom:1px solid #eef3f5;color:#1b2b36}.content-table tr:last-child td{border-bottom:0}.summary-block{background:#f7f9fa;border-radius:6px;padding:14px;font-size:.82rem;line-height:1.55;color:#2b3d47;white-space:pre-wrap}.empty-section{color:#87969c;font-size:.78rem;font-style:italic;margin:6px 0}.empty-state{padding:40px 0;text-align:center;color:#87969c}@media(max-width:800px){.review-layout{grid-template-columns:1fr}}@media(max-width:520px){.review-actions{flex-direction:column}.review-metrics{grid-template-columns:1fr 1fr}}
</style>