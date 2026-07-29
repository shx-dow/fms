<script lang="ts">
  import type { TeachingRecord } from '$lib/domain';
  import { onMount } from 'svelte';
  import './editor.css';
  let { data } = $props();

  let activeSection = $state('teaching');
  let preview = $state(false);
  let submitted = $state(false);
  let savedAt = $state('Saved just now');
  let saveError = $state('');
  let attachmentMessage = $state('');
  let canEdit = $state(true);
  let periodLabel = $state('Current week');
  let reportId = $state('');
  let reportStatus = $state('DRAFT');
  let teaching: TeachingRecord[] = $state([{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0 }]);
  let weeklySummary = $state('');
  let saving = $state(false);
  let confirmSubmit = $state(false);
  let reviews: { decision: string; remarks: string; created_at: string; reviewer_name: string }[] = $state([]);

  let scheduled = $derived(teaching.reduce((sum, item) => sum + Number(item.scheduled || 0), 0));
  let conducted = $derived(teaching.reduce((sum, item) => sum + Number(item.conducted || 0), 0));
  let deliveryRate = $derived(scheduled ? Math.round((conducted / scheduled) * 100) : 0);
  let completion = $derived(Math.min(100, Math.round((teaching.some((item) => item.courseCode && item.courseName) ? 45 : 15) + (scheduled > 0 ? 25 : 0) + (weeklySummary ? 30 : 0))));
  let isReadonly = $derived(!canEdit && reportStatus !== 'CHANGES_REQUIRED');
  let latestReview = $derived(reviews.find((r) => r.decision === 'CHANGES_REQUIRED'));

  onMount(async () => {
    const response = await fetch('/api/reports');
    const d = await response.json();
    reportId = d.report.id;
    reportStatus = d.report.status;
    periodLabel = d.policy?.period?.label ?? periodLabel;
    if (d.teaching?.length) teaching = d.teaching.map((item: any) => ({ courseCode: item.course_code, courseName: item.course_name, programLevel: item.program_level, classType: item.class_type, scheduled: item.scheduled, conducted: item.conducted, missed: item.missed, missedAction: item.missed_action ?? '', syllabusCompletion: item.syllabus_completion ?? 0 }));
    weeklySummary = d.report.summary ?? '';
    canEdit = d.policy?.canEdit ?? true;
    if (reportId) {
      try { const r = await fetch(`/api/reports/${reportId}`); const rd = await r.json(); reviews = rd.reviews ?? []; } catch {}
    }
    savedAt = 'Loaded';
  });

  async function saveDraft(_event?: unknown, status = 'DRAFT') {
    if (!canEdit || saving) return false;
    saving = true; savedAt = 'Saving…';
    const response = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId, teaching, summary: weeklySummary, completion, status }) });
    const d = await response.json().catch(() => ({}));
    saveError = response.ok ? '' : (d.error ?? 'Save failed');
    savedAt = response.ok ? 'Saved' : 'Save failed';
    saving = false;
    return response.ok;
  }
  function addTeaching() { teaching = [...teaching, { courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0 }]; saveDraft(); }
  function removeTeaching(index: number) { teaching = teaching.filter((_, i) => i !== index); saveDraft(); }
  async function uploadEvidence(event: Event) { const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file || !reportId) return; const fd = new FormData(); fd.set('reportId', reportId); fd.set('file', file); const response = await fetch('/api/attachments', { method: 'POST', body: fd }); attachmentMessage = response.ok ? `${file.name} uploaded` : 'Upload failed'; input.value = ''; }
  async function handleSubmit() { confirmSubmit = false; const ok = await saveDraft(undefined, 'SUBMITTED'); if (ok) { submitted = true; reportStatus = 'SUBMITTED'; canEdit = false; } }
  function handleKeydown(e: KeyboardEvent) { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); } }
</script>
<svelte:head><title>Current weekly report · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell editor-shell" onkeydown={handleKeydown}>
  <header class="topbar">
    <a class="brand" href="/">FR<span>·</span>S</a>
    <div class="topbar-user">{data.user?.name ?? 'User'} <span class="avatar">{(data.user?.name ?? 'U').slice(0, 1)}</span></div>
  </header>
  <div class="editor-head">
    <div>
      <div class="eyebrow">Faculty portal · {periodLabel}</div>
      <h1>Faculty weekly report</h1>
      <p>{isReadonly ? 'This report is locked and cannot be edited.' : reportStatus === 'CHANGES_REQUIRED' ? 'Your HOD has requested changes. Review their feedback and resubmit.' : 'Record this week\'s teaching activity. Research, duties and appraisal are managed separately.'}</p>
    </div>
    <div class="editor-actions">
      {#if !isReadonly}
        <span class="save-note"><i></i>{savedAt}</span>
        <a class="quiet" href="/api/reports/current/export">Export CSV</a>
        <button class="quiet" onclick={() => preview = !preview}>{preview ? 'Edit report' : 'Preview'}</button>
        <button class="submit" disabled={!canEdit || saving} onclick={() => confirmSubmit = true}>Submit report <span>→</span></button>
      {/if}
    </div>
  </div>
  {#if submitted}
    <div class="success"><strong>Weekly report submitted for review.</strong><span>Your HOD can now review {periodLabel}.</span><a href="/dashboard">Back to dashboard →</a></div>
  {:else if isReadonly}
    <div class="locked-banner" role="status">
      <strong>Report {reportStatus === 'SUBMITTED' ? 'submitted for review' : 'approved'}.</strong>
      <span>{reportStatus === 'SUBMITTED' ? 'Your HOD is reviewing this report. You will be notified when a decision is made.' : 'This weekly report has been approved. No further action is needed.'}</span>
      <a href="/dashboard">Back to dashboard →</a>
    </div>
  {:else if !canEdit && reportStatus === 'CHANGES_REQUIRED' && latestReview}
    <div class="changes-banner" role="status">
      <strong>Changes requested by {latestReview.reviewer_name}</strong>
      <span>{latestReview.remarks || 'Please review the feedback and update your report before resubmitting.'}</span>
    </div>
  {/if}
  {#if saveError}
    <div class="save-error" role="alert">{saveError}</div>
  {/if}
  {#if confirmSubmit}
    <div class="overlay" onclick={() => confirmSubmit = false}>
      <div class="confirm-dialog" onclick={(e) => e.stopPropagation()}>
        <h3>Submit this report?</h3>
        <p>Once submitted you will not be able to edit it unless an HOD or Admin reopens it.</p>
        <div class="confirm-actions">
          <button class="quiet" onclick={() => confirmSubmit = false}>Cancel</button>
          <button class="submit" onclick={handleSubmit}>Confirm submission <span>→</span></button>
        </div>
      </div>
    </div>
  {/if}
  {#if reviews.length > 0}
    <details class="review-history-details">
      <summary>Review history ({reviews.length})</summary>
      {#each reviews as rv}
        <div class="review-history-entry">
          <span class="rh-status {rv.decision === 'APPROVED' ? 'rh-approved' : 'rh-changes'}">{rv.decision === 'APPROVED' ? 'Approved' : 'Changes requested'}</span>
          <div class="rh-body">
            <strong>{rv.reviewer_name}</strong>
            <span class="rh-date">{new Date(rv.created_at).toLocaleString()}</span>
            {#if rv.remarks}<p class="rh-remarks">{rv.remarks}</p>{/if}
          </div>
        </div>
      {/each}
    </details>
  {/if}
  <div class="editor-layout">
    <nav class="section-nav" aria-label="Report sections">
      <div class="completion">
        <div><span>Report completion</span><strong>{completion}%</strong></div>
        <div class="track"><i style="width:{completion}%"></i></div>
      </div>
      {#each [{ id: 'teaching', label: 'Teaching & delivery', count: teaching.length }, { id: 'summary', label: 'Weekly summary', count: weeklySummary ? 1 : 0 }] as section, index}
        <button class:active={activeSection === section.id} onclick={() => activeSection = section.id}>
          <span class="nav-number">0{index + 1}</span>
          <span>{section.label}</span>
          {#if section.count}<em>{section.count}</em>{/if}
        </button>
      {/each}
      <div class="scope-note">Research, institutional duties, outreach and appraisal are not part of the weekly submission.</div>
    </nav>
    <section class="form-area">
      {#if isReadonly}
        <article class="preview-paper">
          <div class="paper-kicker">Faculty weekly report · {periodLabel}</div>
          <div class="paper-status">{reportStatus === 'SUBMITTED' ? 'Submitted for review' : 'Approved'}</div>
          <h2>Faculty member</h2>
          <p class="paper-meta">{data.user?.name ?? 'Faculty'} · Department of Computer Science and Engineering</p>
          <h3>Teaching & academic delivery</h3>
          {#each teaching as item}
            <div class="paper-row">
              <strong>{item.courseCode || 'Untitled course'}</strong>
              <span>{item.courseName || 'Course name pending'}</span>
              <span>{item.conducted} / {item.scheduled} classes · {item.syllabusCompletion}% syllabus</span>
            </div>
          {:else}
            <p class="empty-section">No teaching records.</p>
          {/each}
          <h3>Weekly summary</h3>
          <div class="summary-block">{weeklySummary || 'No summary entered.'}</div>
        </article>
      {:else if preview}
        <div class="preview-banner">
          <strong>Preview mode</strong>
          <span>This is how your weekly report will appear to the reviewer.</span>
          <button class="quiet" onclick={() => preview = false}>Return to editing</button>
        </div>
        <article class="preview-paper">
          <div class="paper-kicker">Faculty weekly report · {periodLabel}</div>
          <h2>Faculty member</h2>
          <p class="paper-meta">Department of Computer Science and Engineering</p>
          <h3>Teaching & academic delivery</h3>
          {#each teaching as item}
            <div class="paper-row">
              <strong>{item.courseCode || 'Untitled course'}</strong>
              <span>{item.courseName || 'Course name pending'}</span>
              <span>{item.conducted} / {item.scheduled} classes · {item.syllabusCompletion}% syllabus</span>
            </div>
          {/each}
          <h3>Weekly summary</h3>
          <p>{weeklySummary || 'No summary entered.'}</p>
        </article>
      {:else if activeSection === 'teaching'}
        <div class="section-intro">
          <div>
            <div class="eyebrow">Section 01</div>
            <h2>Teaching & academic delivery</h2>
            <p>Add every course or class group covered during this week.</p>
          </div>
          <span class="metric-pill">{deliveryRate}% delivery rate</span>
        </div>
        <div class="record-list">
          {#each teaching as item, index}
            <article class="record">
              <div class="record-top">
                <span class="record-index">Course {index + 1}</span>
                {#if teaching.length > 1}
                  <button class="remove" onclick={() => removeTeaching(index)}>Remove</button>
                {/if}
              </div>
              <div class="field-grid">
                <label>Course code<input bind:value={item.courseCode} oninput={saveDraft} placeholder="CSE-301" /></label>
                <label>Course name<input bind:value={item.courseName} oninput={saveDraft} placeholder="Database Management Systems" /></label>
                <label>Program / level<input bind:value={item.programLevel} oninput={saveDraft} placeholder="B.Tech · III Year" /></label>
                <label>Class type<select bind:value={item.classType} onchange={saveDraft}><option>Lecture</option><option>Lab</option><option>Tutorial</option><option>Seminar</option></select></label>
              </div>
              <div class="number-grid">
                <label>Total scheduled<input type="number" min="0" bind:value={item.scheduled} oninput={saveDraft} placeholder="0" /></label>
                <label>Classes taken<input type="number" min="0" bind:value={item.conducted} oninput={saveDraft} placeholder="0" /></label>
                <label>Classes missed<input type="number" min="0" bind:value={item.missed} oninput={saveDraft} placeholder="0" /></label>
                <label>Syllabus completion %<input type="number" min="0" max="100" bind:value={item.syllabusCompletion} oninput={saveDraft} placeholder="0" /></label>
              </div>
              <label>Action taken for missed classes<input bind:value={item.missedAction} oninput={saveDraft} placeholder="e.g. Makeup class scheduled" /></label>
            </article>
          {/each}
          <button class="add-record" onclick={addTeaching}>+ Add another course</button>
        </div>
      {:else if activeSection === 'summary'}
        <div class="section-intro">
          <div>
            <div class="eyebrow">Section 02</div>
            <h2>Weekly summary</h2>
            <p>Provide a brief narrative of this week's teaching activities, notable events, or student interactions.</p>
          </div>
        </div>
        <textarea bind:value={weeklySummary} oninput={saveDraft} rows="6" placeholder="Summarise the week's teaching, student engagement, and any notable academic events…" style="width:100%;border:1px solid #cbd7de;border-radius:6px;padding:11px;font:inherit;background:#fbfcfc;resize:vertical"></textarea>
      {/if}
    </section>
  </div>
  {#if !isReadonly}
  <section class="evidence-panel">
    <div><strong>Supporting evidence</strong><p>Optional PDF, PNG, or JPEG files up to 10 MB.</p></div>
    <label class="upload-control" class:disabled={!canEdit}>
      Upload file<input disabled={!canEdit} type="file" accept="application/pdf,image/png,image/jpeg" onchange={uploadEvidence} />
    </label>
    {#if attachmentMessage}<span class="attachment-message">{attachmentMessage}</span>{/if}
  </section>
  {/if}
</main>
<style>
  .scope-note{margin:22px 16px 0;padding:14px;border:1px solid #dce2dc;border-radius:10px;color:#667477;font-size:.75rem;line-height:1.45;background:#f5f4ef}
  .overlay{position:fixed;inset:0;background:rgba(27,43,54,.35);display:grid;place-items:center;z-index:100}
  .confirm-dialog{background:#fdfcf9;border:1px solid #dbe3e7;border-radius:10px;padding:28px;max-width:420px;width:90%;box-shadow:0 8px 30px rgba(0,0,0,.12)}
  .confirm-dialog h3{margin:0 0 8px;font-size:1.15rem;color:#1b2b36}
  .confirm-dialog p{margin:0 0 20px;color:#71818a;font-size:.85rem;line-height:1.5}
  .confirm-actions{display:flex;justify-content:flex-end;gap:10px}
  .changes-banner{display:flex;flex-direction:column;gap:5px;background:#f7ead2;border:1px solid #ebd6a3;border-radius:7px;padding:14px 18px;margin-bottom:14px}
  .changes-banner strong{color:#97651b;font-size:.85rem}
  .changes-banner span{color:#7a5a23;font-size:.8rem}
  .review-history-details{margin-bottom:16px;background:#f7f9fa;border:1px solid #dbe3e7;border-radius:7px;padding:12px 16px}
  .review-history-details summary{cursor:pointer;font-size:.78rem;font-weight:700;color:#61727d}
  .review-history-entry{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #eef3f5;font-size:.8rem}
  .review-history-entry:last-child{border-bottom:0}
  .rh-status{flex:none;padding:3px 7px;border-radius:3px;font-size:.62rem;font-weight:800;white-space:nowrap;align-self:start}
  .rh-approved{background:#e4f3ef;color:#167166}
  .rh-changes{background:#f7ead2;color:#97651b}
  .rh-body strong{display:block;font-size:.78rem}
  .rh-date{display:block;font-size:.68rem;color:#87969c;margin-top:2px}
  .rh-remarks{margin:6px 0 0;color:#4a5d68;font-size:.78rem;line-height:1.4}
  .paper-status{display:inline-block;background:#e2e8ec;color:#536871;padding:3px 9px;border-radius:99px;font-size:.65rem;font-weight:800;margin-bottom:12px}
  .summary-block{background:#f7f9fa;border-radius:6px;padding:14px;font-size:.82rem;line-height:1.55;color:#2b3d47;white-space:pre-wrap}
  .empty-section{color:#87969c;font-size:.78rem;font-style:italic;margin:6px 0}
</style>