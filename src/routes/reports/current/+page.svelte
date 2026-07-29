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
  let attachments: { id: string; filename: string; mime_type: string; size: number; created_at: string }[] = $state([]);
  let researchRecords: any[] = $state([]);
  let dutiesRecords: any[] = $state([]);
  let outreachRecords: any[] = $state([]);
  let additionalSaving = $state(false);
  let activeExtraSection = $state('attachments');
  let deadlineDate = $state('');

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
    researchRecords = (d.research ?? []).map((r: any) => ({ category: r.category, title: r.title, venueOrAgency: r.venue_or_agency ?? '', indexingOrQuality: r.indexing_or_quality ?? '', role: r.role ?? '', status: r.status ?? '' }));
    dutiesRecords = (d.duties ?? []).map((r: any) => ({ name: r.name, role: r.role, activity: r.activity ?? '', reach: r.reach ?? '', outcome: r.outcome ?? '' }));
    outreachRecords = (d.outreach ?? []).map((r: any) => ({ activity: r.activity, audience: r.audience ?? '', outcome: r.outcome ?? '', date: r.date ?? '' }));
    canEdit = d.policy?.canEdit ?? true;
    if (reportId) {
      try { const r = await fetch(`/api/reports/${reportId}`); const rd = await r.json(); reviews = rd.reviews ?? []; } catch {}
      loadAttachments();
    }
    savedAt = 'Loaded';
  });
  async function loadAttachments() { try { const r = await fetch(`/api/attachments?reportId=${reportId}`); const d = await r.json(); attachments = d.attachments ?? []; } catch {} }
  async function uploadEvidence(event: Event) { const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file || !reportId) return; const fd = new FormData(); fd.set('reportId', reportId); fd.set('file', file); const response = await fetch('/api/attachments', { method: 'POST', body: fd }); attachmentMessage = response.ok ? `${file.name} uploaded` : 'Upload failed'; input.value = ''; if (response.ok) loadAttachments(); }
  async function deleteAttachment(id: string) { await fetch(`/api/attachments/${id}`, { method: 'DELETE' }); loadAttachments(); }
  function formatSize(bytes: number) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB'; }
  const fileName = (n: string) => n.length > 40 ? n.slice(0, 37) + '…' : n;

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
  async function saveActivity(kind: 'research' | 'duties' | 'outreach') {
    if (!reportId || !canEdit || additionalSaving) return;
    additionalSaving = true;
    const response = await fetch(`/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId, records: kind === 'research' ? researchRecords : kind === 'duties' ? dutiesRecords : outreachRecords }) });
    additionalSaving = false;
    savedAt = response.ok ? 'Saved' : 'Save failed';
  }
  function addTeaching() { teaching = [...teaching, { courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0 }]; saveDraft(); }
  function removeTeaching(index: number) { teaching = teaching.filter((_, i) => i !== index); saveDraft(); }
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
      {#each [{ id: 'teaching', label: 'Teaching & delivery', count: teaching.length }, { id: 'summary', label: 'Weekly summary', count: weeklySummary ? 1 : 0 }, { id: 'additional', label: 'Evidence & records', count: attachments.length }] as section, index}
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
      {:else if activeSection === 'additional'}
        <div class="additional-tabs"><button class:active={activeExtraSection === 'attachments'} onclick={() => activeExtraSection = 'attachments'}><span>📎</span>Files ({attachments.length})</button><button class:active={activeExtraSection === 'research'} onclick={() => activeExtraSection = 'research'}><span>📄</span>Research</button><button class:active={activeExtraSection === 'duties'} onclick={() => activeExtraSection = 'duties'}><span>🏛</span>Duties</button><button class:active={activeExtraSection === 'outreach'} onclick={() => activeExtraSection = 'outreach'}><span>🤝</span>Outreach</button></div>
        <div class="extra-panel">
          {#if activeExtraSection === 'attachments'}
            <div class="section-intro"><div><div class="eyebrow">Evidence</div><h2>Supporting files</h2><p>Upload PDF, PNG or JPEG files (max 10 MB each) to support your report.</p></div></div>
            <div class="attachment-grid">{#each attachments as a}<div class="attachment-card"><div class="attach-icon">{a.mime_type.includes('pdf') ? '📄' : '🖼'}</div><div class="attach-info"><strong>{fileName(a.filename)}</strong><small>{formatSize(a.size)} · {new Date(a.created_at).toLocaleDateString()}</small></div><div class="attach-actions"><a class="dl-link" href="/api/attachments/{a.id}" download>Download</a>{#if canEdit}<button class="remove-attach" onclick={() => deleteAttachment(a.id)}>Delete</button>{/if}</div></div>{:else}<div class="empty-section">No files uploaded yet.</div>{/each}</div>
            {#if canEdit}<div class="upload-area"><label class="upload-control">+ Upload file<input disabled={!canEdit} type="file" accept="application/pdf,image/png,image/jpeg" onchange={uploadEvidence} /></label>{#if attachmentMessage}<span class="attachment-message">{attachmentMessage}</span>{/if}</div>{/if}
          {:else if activeExtraSection === 'research'}
            <div class="section-intro"><div><div class="eyebrow">Ongoing record</div><h2>Research & publications</h2><p>Maintain work that spans multiple weeks without repeating it in every report.</p></div></div>
            {#each researchRecords as item}<div class="ongoing-record"><div class="field-grid"><label>Category<select bind:value={item.category}><option>Journal Paper</option><option>Patent</option><option>Research Grant</option><option>Conference / FDP</option></select></label><label>Title<input bind:value={item.title} placeholder="Title of paper, patent or project" /></label><label>Venue / agency<input bind:value={item.venueOrAgency} /></label><label>Status<input bind:value={item.status} placeholder="In progress, submitted, published" /></label></div></div>{/each}<div class="ongoing-actions"><button class="add-record" onclick={() => researchRecords = [...researchRecords, { category:'Journal Paper', title:'', venueOrAgency:'', indexingOrQuality:'', role:'', status:'' }]}>+ Add research record</button><button class="quiet" onclick={() => saveActivity('research')}>{additionalSaving ? 'Saving…' : 'Save research'}</button></div>
          {:else if activeExtraSection === 'duties'}
            <div class="section-intro"><div><div class="eyebrow">Ongoing record</div><h2>Institutional duties</h2><p>Keep committee, club and departmental responsibilities current.</p></div></div>
            {#each dutiesRecords as item}<div class="ongoing-record"><div class="field-grid"><label>Committee / body<input bind:value={item.name} /></label><label>Role<input bind:value={item.role} /></label><label>Activity<input bind:value={item.activity} /></label><label>Outcome<input bind:value={item.outcome} /></label></div></div>{/each}<div class="ongoing-actions"><button class="add-record" onclick={() => dutiesRecords = [...dutiesRecords, { name:'', role:'', activity:'', reach:'', outcome:'' }]}>+ Add duty</button><button class="quiet" onclick={() => saveActivity('duties')}>{additionalSaving ? 'Saving…' : 'Save duties'}</button></div>
          {:else if activeExtraSection === 'outreach'}
            <div class="section-intro"><div><div class="eyebrow">Ongoing record</div><h2>Outreach & admissions</h2><p>Log events and engagement activities when they happen.</p></div></div>
            {#each outreachRecords as item}<div class="ongoing-record"><div class="field-grid"><label>Activity<input bind:value={item.activity} /></label><label>Audience<input bind:value={item.audience} /></label><label>Date<input type="date" bind:value={item.date} /></label><label>Outcome<input bind:value={item.outcome} /></label></div></div>{/each}<div class="ongoing-actions"><button class="add-record" onclick={() => outreachRecords = [...outreachRecords, { activity:'', audience:'', outcome:'', date:'' }]}>+ Add outreach</button><button class="quiet" onclick={() => saveActivity('outreach')}>{additionalSaving ? 'Saving…' : 'Save outreach'}</button></div>
          {/if}
        </div>
      {/if}
    </section>
  </div>
  {#if !isReadonly}
  <section class="evidence-panel">
    <div><strong>Supporting evidence</strong><p>{attachments.length} file{attachments.length === 1 ? '' : 's'} attached{attachments.length ? ` · ${attachments.map(a => fileName(a.filename)).join(', ')}` : ''}.</p></div>
    <div class="panel-mini-actions"><button class="quiet" onclick={() => { activeSection = 'additional'; activeExtraSection = 'attachments'; }}>Manage files</button></div>
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
  .additional-tabs{display:flex;gap:2px;background:#f1f5f6;border-radius:6px;padding:3px;margin-bottom:18px}.additional-tabs button{flex:1;border:0;background:transparent;padding:9px 10px;border-radius:4px;font:inherit;font-size:.76rem;color:#61727d;cursor:pointer;transition:all .12s;display:flex;align-items:center;gap:6px;justify-content:center}.additional-tabs button.active{background:#fdfcf9;color:#1b2b36;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.06)}.extra-panel{min-height:120px}.extra-note{background:#f7f9fa;border:1px solid #dbe3e7;border-radius:7px;padding:16px;color:#6b7e88;font-size:.8rem;line-height:1.5;margin:0}.attachment-grid{display:grid;gap:8px;margin-bottom:16px}.attachment-card{display:flex;align-items:center;gap:10px;padding:11px 13px;background:#f7f9fa;border:1px solid #e6ecee;border-radius:6px}.attach-icon{font-size:1.2rem}.attach-info{flex:1;min-width:0}.attach-info strong{display:block;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.attach-info small{color:#87969c;font-size:.68rem}.attach-actions{display:flex;gap:8px;flex:none}.dl-link{color:#087f73;text-decoration:none;font-size:.72rem;font-weight:700}.remove-attach{border:0;background:transparent;color:#a24e45;font:inherit;font-size:.72rem;font-weight:700;cursor:pointer;padding:0}.upload-area{margin-top:12px}.upload-control{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border:1px dashed #b5c9cf;border-radius:6px;color:#61727d;font-size:.8rem;font-weight:700;cursor:pointer;transition:background .12s}.upload-control:hover{background:#f1f5f6}.upload-control input{display:none}.attachment-message{margin-left:12px;color:#87969c;font-size:.74rem}.panel-mini-actions a{color:#087f73;text-decoration:none;font-size:.75rem;font-weight:750}
</style>
