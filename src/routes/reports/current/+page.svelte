<script lang="ts">
  import type { TeachingRecord } from '$lib/domain';
  import { onDestroy, onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  let { data } = $props();

  let activeSection = $state('teaching');
  let preview = $state(false);
  let submitted = $state(false);
  let savedAt = $state('');
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let teachingSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let canEdit = $state(true);
  let periodLabel = $state('');
  let reportId = $state('');
  let reportStatus = $state('DRAFT');
  let teaching: TeachingRecord[] = $state([{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0 }]);
  let weeklySummary = $state('');
  let saving = $state(false);
  let confirmSubmit = $state(false);
  let confirmCopy = $state(false);
  let history: any[] = $state([]);
  let reviews: { decision: string; remarks: string; created_at: string; reviewer_name: string }[] = $state([]);
  let attachments: { id: string; filename: string; mime_type: string; size: number; created_at: string }[] = $state([]);
  let researchRecords: any[] = $state([]);
  let dutiesRecords: any[] = $state([]);
  let outreachRecords: any[] = $state([]);
  let additionalSaving = $state(false);
  let saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let activeExtraSection = $state('attachments');
  let deadlineDate = $state('');
  let canSubmit = $derived(new Date().getDay() === 5);

  let scheduled = $derived(teaching.reduce((s, i) => s + Number(i.scheduled || 0), 0));
  let conducted = $derived(teaching.reduce((s, i) => s + Number(i.conducted || 0), 0));
  let deliveryRate = $derived(scheduled ? Math.round((conducted / scheduled) * 100) : 0);
  let hasValidTeaching = $derived(teaching.some(i => i.courseCode?.trim() && i.courseName?.trim()));
  let teachingValid = $derived(teaching.every(i => {
    if (!i.courseCode?.trim() && !i.courseName?.trim()) return true;
    return Number(i.conducted ?? 0) <= Number(i.scheduled ?? 0);
  }));
  let researchActive = $derived(researchRecords.filter(r => r.title?.trim()).length);
  let dutiesCount = $derived(dutiesRecords.filter(d => d.name?.trim()).length);
  let hasResearch = $derived(researchActive > 0);
  let hasDuties = $derived(dutiesCount > 0);
  let deliveryOk = $derived(deliveryRate >= 90);
  let completion = $derived(Math.min(100, Math.round(
    (hasValidTeaching ? 30 : 0) +
    (hasValidTeaching && scheduled > 0 ? 15 : 0) +
    (teachingValid ? 10 : 0) +
    (hasResearch ? 15 : 0) +
    (hasDuties ? 10 : 0) +
    (deliveryOk ? 10 : 0) +
    (hasValidTeaching && hasResearch && hasDuties ? 10 : 0)
  )));
  let autoSummary = $derived(
    `This week you conducted ${conducted} of ${scheduled} scheduled classes (${deliveryRate}% delivery rate) across ${teaching.filter(t => t.courseCode?.trim()).length} course(s). ${researchActive > 0 ? `${researchActive} research record(s) active. ` : ''}${dutiesCount > 0 ? `${dutiesCount} institutional dut${dutiesCount === 1 ? 'y' : 'ies'}. ` : ''}${attachments.length > 0 ? `${attachments.length} file(s) attached.` : ''}`
  );
  let isReadonly = $derived(!canEdit && reportStatus !== 'CHANGES_REQUIRED');
  let prevReport = $derived(history.find(r => r.id !== reportId));
  let prevReportLabel = $derived(prevReport?.period_label ?? '');
  let latestReview = $derived(reviews.find(r => r.decision === 'CHANGES_REQUIRED'));
  let statusClass = $derived(
    reportStatus === 'APPROVED' ? 'approved' : reportStatus === 'SUBMITTED' ? 'submitted' : reportStatus === 'CHANGES_REQUIRED' ? 'changes' : 'draft'
  );
  let statusLabel = $derived(
    reportStatus === 'APPROVED' ? 'Approved' : reportStatus === 'SUBMITTED' ? 'Submitted' : reportStatus === 'CHANGES_REQUIRED' ? 'Changes requested' : 'Draft'
  );

  onMount(async () => {
    const res = await fetch('/api/reports');
    const d = await res.json();
    reportId = d.report.id;
    reportStatus = d.report.status;
    history = d.reports ?? [];
    periodLabel = d.report?.period_label ?? d.policy?.period?.label ?? periodLabel;
    if (d.teaching?.length)
      teaching = d.teaching.map((t: any) => ({ courseCode: t.course_code, courseName: t.course_name, programLevel: t.program_level, classType: t.class_type, scheduled: t.scheduled, conducted: t.conducted, missed: t.missed, missedAction: t.missed_action ?? '', syllabusCompletion: t.syllabus_completion ?? 0 }));
    weeklySummary = d.report.summary ?? '';
    researchRecords = (d.research ?? []).map((r: any) => ({ category: r.category, title: r.title, venueOrAgency: r.venue_or_agency ?? '', indexingOrQuality: r.indexing_or_quality ?? '', role: r.role ?? '', status: r.status ?? '' }));
    dutiesRecords = (d.duties ?? []).map((r: any) => ({ name: r.name, role: r.role, activity: r.activity ?? '', reach: r.reach ?? '', outcome: r.outcome ?? '' }));
    outreachRecords = (d.outreach ?? []).map((r: any) => ({ activity: r.activity, audience: r.audience ?? '', outcome: r.outcome ?? '', date: r.date ?? '' }));
    canEdit = d.policy?.canEdit ?? true;
    if (reportId) {
      try { const r = await fetch(`/api/reports/${reportId}`); const rd = await r.json(); reviews = rd.reviews ?? []; } catch {}
      loadAttachments();
    }
    savedAt = '';
  });
  onDestroy(() => { clearTimeout(saveTimer); clearTimeout(teachingSaveTimer); Object.values(saveTimers).forEach(clearTimeout); Object.values(removalTimers).forEach(clearTimeout); });
  function flashSaved() {
    clearTimeout(saveTimer);
    savedAt = 'Draft Saved';
    saveTimer = setTimeout(() => { savedAt = ''; }, 3000);
  }
  async function loadAttachments() {
    try { const r = await fetch(`/api/attachments?reportId=${reportId}`); const d = await r.json(); attachments = d.attachments ?? []; } catch {}
  }
  async function uploadEvidence(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !reportId) return;
    const fd = new FormData(); fd.set('reportId', reportId); fd.set('file', file);
    const res = await fetch('/api/attachments', { method: 'POST', body: fd });
    input.value = '';
    if (res.ok) { loadAttachments(); show(`${file.name} uploaded`); }
    else show('Upload failed', 'err');
  }
  async function deleteAttachment(id: string) { await fetch(`/api/attachments/${id}`, { method: 'DELETE' }); loadAttachments(); }
  function formatSize(b: number) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
  const fileName = (n: string) => (n.length > 40 ? n.slice(0, 37) + '...' : n);
  async function saveDraft(_e?: unknown, status = 'DRAFT') {
    if (!canEdit || saving) return false;
    saving = true; clearTimeout(saveTimer); savedAt = 'Saving...';
    const res = await fetch('/api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId, teaching, completion, status }) });
    const d = await res.json().catch(() => ({}));
    saving = false;
    if (!res.ok) { show(d.error ?? 'Save failed', 'err'); return false; }
    if (res.ok) flashSaved(); else savedAt = 'Save failed';
    return res.ok;
  }
  function scheduleSave(kind: 'research' | 'duties' | 'outreach') {
    clearTimeout(saveTimers[kind]);
    saveTimers[kind] = setTimeout(() => saveActivity(kind), 600);
  }
  async function saveActivity(kind: 'research' | 'duties' | 'outreach') {
    if (!reportId || !canEdit || additionalSaving) return;
    additionalSaving = true; clearTimeout(saveTimer); savedAt = 'Saving...';
    await fetch(`/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId, records: kind === 'research' ? researchRecords : kind === 'duties' ? dutiesRecords : outreachRecords }) });
    additionalSaving = false; flashSaved();
  }
  function addTeaching() { teaching = [...teaching, { courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0 }]; scheduleTeachingSave(); }
  const UNDO_MS = 8000;
  let removalTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  function removeRow(kind: 'teaching' | 'research' | 'duties' | 'outreach', i: number) {
    const arr = kind === 'teaching' ? teaching : kind === 'research' ? researchRecords : kind === 'duties' ? dutiesRecords : outreachRecords;
    const record = arr[i];
    const setArr = kind === 'teaching' ? (v: any[]) => (teaching = v) : kind === 'research' ? (v: any[]) => (researchRecords = v) : kind === 'duties' ? (v: any[]) => (dutiesRecords = v) : (v: any[]) => (outreachRecords = v);
    setArr(arr.filter((_, j) => j !== i));
    clearTimeout(removalTimers[kind]);
    show('Removed', 'ok', { label: 'Undo', onClick: () => undoRow(kind, i, record) }, UNDO_MS);
    removalTimers[kind] = setTimeout(() => { if (kind === 'teaching') saveDraft(); else saveActivity(kind); }, UNDO_MS);
  }
  function undoRow(kind: 'teaching' | 'research' | 'duties' | 'outreach', i: number, record: any) {
    clearTimeout(removalTimers[kind]);
    const arr = kind === 'teaching' ? teaching : kind === 'research' ? researchRecords : kind === 'duties' ? dutiesRecords : outreachRecords;
    const setArr = kind === 'teaching' ? (v: any[]) => (teaching = v) : kind === 'research' ? (v: any[]) => (researchRecords = v) : kind === 'duties' ? (v: any[]) => (dutiesRecords = v) : (v: any[]) => (outreachRecords = v);
    const at = Math.min(i, arr.length);
    setArr([...arr.slice(0, at), record, ...arr.slice(at)]);
    if (kind === 'teaching') scheduleTeachingSave(); else scheduleSave(kind);
    show('Restored');
  }
  function removeTeaching(i: number) { removeRow('teaching', i); }
  function removeResearch(i: number) { removeRow('research', i); }
  function removeDuty(i: number) { removeRow('duties', i); }
  function removeOutreach(i: number) { removeRow('outreach', i); }
  function scheduleTeachingSave() {
    clearTimeout(teachingSaveTimer);
    teachingSaveTimer = setTimeout(() => saveDraft(), 600);
  }
  async function handleSubmit() { confirmSubmit = false; const ok = await saveDraft(undefined, 'SUBMITTED'); if (ok) { submitted = true; reportStatus = 'SUBMITTED'; canEdit = false; } }
  async function copyFromLastWeek() {
    confirmCopy = false;
    if (!prevReport) { show('No previous report to copy from.', 'err'); return; }
    try {
      const res = await fetch(`/api/reports/${prevReport.id}`);
      const d = await res.json();
      if (!res.ok) { show(d.error ?? 'Could not load last week\u2019s report.', 'err'); return; }
      teaching = (d.teaching ?? []).map((t: any) => ({ courseCode: t.course_code, courseName: t.course_name, programLevel: t.program_level, classType: t.class_type, scheduled: t.scheduled, conducted: t.conducted, missed: t.missed, missedAction: t.missed_action ?? '', syllabusCompletion: t.syllabus_completion ?? 0 }));
      researchRecords = (d.research ?? []).map((r: any) => ({ category: r.category, title: r.title, venueOrAgency: r.venue_or_agency ?? '', indexingOrQuality: r.indexing_or_quality ?? '', role: r.role ?? '', status: r.status ?? '' }));
      dutiesRecords = (d.duties ?? []).map((r: any) => ({ name: r.name, role: r.role, activity: r.activity ?? '', reach: r.reach ?? '', outcome: r.outcome ?? '' }));
      outreachRecords = (d.outreach ?? []).map((r: any) => ({ activity: r.activity, audience: r.audience ?? '', outcome: r.outcome ?? '', date: r.date ?? '' }));
      if (!teaching.length) teaching = [{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0 }];
      await saveDraft();
      await saveActivity('research');
      await saveActivity('duties');
      await saveActivity('outreach');
      show(`Copied from ${prevReportLabel}. Update the numbers for this week.`);
    } catch { show('Could not load last week\u2019s report.', 'err'); }
  }
  function handleKeydown(e: KeyboardEvent) { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); } }
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<svelte:head><title>Report · Faculty Reporting System</title></svelte:head>
<main class="shell">
  {#if submitted}
    <div class="success-banner">
      <strong>Report submitted for review.</strong>
      <span>Your HOD can now review {periodLabel}.</span>
      <a href="/dashboard">Back to dashboard →</a>
    </div>
  {:else if isReadonly}
    <div class="state-banner locked">
      <strong>Report {reportStatus === 'SUBMITTED' ? 'submitted for review' : 'approved'}.</strong>
      <span>{reportStatus === 'SUBMITTED' ? 'Your HOD is reviewing it.' : 'No further action needed.'}</span>
      <a href="/dashboard">Back to dashboard →</a>
    </div>
  {:else if !canEdit && reportStatus === 'CHANGES_REQUIRED' && latestReview}
    <div class="state-banner changes">
      <strong>Changes requested by {latestReview.reviewer_name}</strong>
      <span>{latestReview.remarks || 'Review the feedback and resubmit.'}</span>
    </div>
  {/if}

  <header class="editor-head">
    <div class="editor-head-left">
      <h1>Report</h1>
      <span class="head-period">{periodLabel}</span>
      <span class="status-pill {statusClass}">{statusLabel} · {completion}%</span>
    </div>
    <div class="editor-actions">
      <span class="save-note">{savedAt}</span>
      {#if !isReadonly && prevReport}
        <button class="act-link" onclick={() => (confirmCopy = true)} title={`Fill this report from ${prevReportLabel}`}>Copy from last week</button>
      {/if}
      <a class="act-link" href="/api/reports/{reportId}/pdf" target="_blank">PDF</a>
      <a class="act-link" href="/api/reports/current/export">CSV</a>
      {#if !isReadonly}
        <button class="act-link" onclick={() => (preview = !preview)}>{preview ? 'Edit' : 'Preview'}</button>
        <button class="act-submit" disabled={!canEdit || saving || !canSubmit} title={!canSubmit ? 'Opens Friday' : ''} onclick={() => (confirmSubmit = true)}>Submit →</button>
      {/if}
    </div>
  </header>
  <div class="progress-track"><i style="width:{completion}%"></i></div>

  {#if confirmSubmit}
    <div class="overlay" role="presentation" onclick={() => (confirmSubmit = false)} onkeydown={(e) => { if (e.key === 'Escape') confirmSubmit = false; }}>
      <div class="confirm-dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h3>Submit this report?</h3>
        <p>Once submitted you will not be able to edit it unless an HOD or Admin reopens it.</p>
        <div class="confirm-actions">
          <button class="act-link" onclick={() => (confirmSubmit = false)}>Cancel</button>
          <button class="act-submit" disabled={!canSubmit} onclick={handleSubmit}>Confirm →</button>
        </div>
      </div>
    </div>
  {/if}

  {#if confirmCopy}
    <div class="overlay" role="presentation" onclick={() => (confirmCopy = false)} onkeydown={(e) => { if (e.key === 'Escape') confirmCopy = false; }}>
      <div class="confirm-dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h3>Copy from last week?</h3>
        <p>This will replace all the data you currently have across all sections (Teaching, Research, Duties, Outreach) with the report from {prevReportLabel}. Do you still want to copy?</p>
        <div class="confirm-actions">
          <button class="act-link" onclick={() => (confirmCopy = false)}>Cancel</button>
          <button class="act-submit" onclick={copyFromLastWeek}>Copy →</button>
        </div>
      </div>
    </div>
  {/if}

  {#if reviews.length > 0}
    <details class="review-box">
      <summary>Review history ({reviews.length})</summary>
      {#each reviews as rv}
        <div class="review-row">
          <span class="review-pill" class:rv-ok={rv.decision === 'APPROVED'} class:rv-chg={rv.decision === 'CHANGES_REQUIRED'}>{rv.decision === 'APPROVED' ? 'Approved' : 'Changes'}</span>
          <div class="review-body">
            <strong>{rv.reviewer_name}</strong>
            <span class="review-date">{new Date(rv.created_at).toLocaleString()}</span>
            {#if rv.remarks}<p>{rv.remarks}</p>{/if}
          </div>
        </div>
      {/each}
    </details>
  {/if}

  <div class="editor-layout">
    <nav class="section-nav">
      <button class:active={activeSection === 'teaching'} onclick={() => (activeSection = 'teaching')}>
        <span class="sn-num">01</span> Teaching & delivery <span class="sn-count">{teaching.length}</span>
      </button>
      <button class:active={activeSection === 'research'} onclick={() => (activeSection = 'research')}>
        <span class="sn-num">02</span> Research & publications <span class="sn-count">{researchRecords.length}</span>
      </button>
      <button class:active={activeSection === 'duties'} onclick={() => (activeSection = 'duties')}>
        <span class="sn-num">03</span> Institutional duties <span class="sn-count">{dutiesRecords.length}</span>
      </button>
      <button class:active={activeSection === 'summary'} onclick={() => (activeSection = 'summary')}>
        <span class="sn-num">04</span> Weekly summary <span class="sn-count">{weeklySummary ? '1' : '0'}</span>
      </button>
      <button class:active={activeSection === 'additional'} onclick={() => (activeSection = 'additional')}>
        <span class="sn-num">05</span> Evidence & records <span class="sn-count">{attachments.length}</span>
      </button>
    </nav>

    <section class="form-area">
      {#if isReadonly}
        <div class="preview-paper">
          <div class="preview-kicker">Faculty weekly report · {periodLabel}</div>
          <h2>Teaching & academic delivery</h2>
          {#each teaching as item}
            <div class="preview-row">
              <strong>{item.courseCode || 'Untitled'}</strong>
              <span>{item.courseName || 'Course name pending'}</span>
              <span class="preview-stat">{item.conducted} / {item.scheduled} classes · {item.syllabusCompletion}% syllabus</span>
            </div>
          {:else}
            <p class="empty">No teaching records.</p>
          {/each}
          <h2>Research & publications</h2>
          {#each researchRecords as item}
            <div class="preview-row">
              <strong>{item.title || 'Untitled'}</strong>
              <span>{item.category}</span>
              <span class="preview-stat">{item.status || '—'}{item.venueOrAgency ? ` · ${item.venueOrAgency}` : ''}</span>
            </div>
          {:else}
            <p class="empty">No research records.</p>
          {/each}
          <h2>Institutional duties</h2>
          {#each dutiesRecords as item}
            <div class="preview-row">
              <strong>{item.name || 'Untitled'}</strong>
              <span>{item.role || '—'}</span>
              <span class="preview-stat">{item.activity || '—'}</span>
            </div>
          {:else}
            <p class="empty">No duties recorded.</p>
          {/each}
          <h2>Outreach & admissions</h2>
          {#each outreachRecords as item}
            <div class="preview-row">
              <strong>{item.activity || 'Untitled'}</strong>
              <span>{item.audience || '—'}</span>
              <span class="preview-stat">{item.date || '—'}</span>
            </div>
          {:else}
            <p class="empty">No outreach recorded.</p>
          {/each}
          <h2>Weekly summary</h2>
          <div class="preview-text">{autoSummary}</div>
        </div>
      {:else if preview}
        <div class="preview-bar">
          <strong>Preview mode</strong>
          <button class="act-link" onclick={() => (preview = false)}>Return to editing</button>
        </div>
        <div class="preview-paper">
          <div class="preview-kicker">Faculty weekly report · {periodLabel}</div>
          <h2>Teaching & academic delivery</h2>
          {#each teaching as item}
            <div class="preview-row">
              <strong>{item.courseCode || 'Untitled'}</strong>
              <span>{item.courseName || 'Course name pending'}</span>
              <span class="preview-stat">{item.conducted} / {item.scheduled} classes · {item.syllabusCompletion}% syllabus</span>
            </div>
          {/each}
          <h2>Research & publications</h2>
          {#each researchRecords as item}
            <div class="preview-row">
              <strong>{item.title || 'Untitled'}</strong>
              <span>{item.category}</span>
              <span class="preview-stat">{item.status || '—'}{item.venueOrAgency ? ` · ${item.venueOrAgency}` : ''}</span>
            </div>
          {:else}
            <p class="empty">No research records.</p>
          {/each}
          <h2>Institutional duties</h2>
          {#each dutiesRecords as item}
            <div class="preview-row">
              <strong>{item.name || 'Untitled'}</strong>
              <span>{item.role || '—'}</span>
              <span class="preview-stat">{item.activity || '—'}</span>
            </div>
          {:else}
            <p class="empty">No duties recorded.</p>
          {/each}
          <h2>Outreach & admissions</h2>
          {#each outreachRecords as item}
            <div class="preview-row">
              <strong>{item.activity || 'Untitled'}</strong>
              <span>{item.audience || '—'}</span>
              <span class="preview-stat">{item.date || '—'}</span>
            </div>
          {:else}
            <p class="empty">No outreach recorded.</p>
          {/each}
          <h2>Weekly summary</h2>
          <p>{autoSummary}</p>
        </div>
      {:else if activeSection === 'teaching'}
        <div class="section-top">
          <h2>Teaching & academic delivery</h2>
          <span class="metric-badge">{deliveryRate}% delivery</span>
        </div>
        <div class="course-list">
          {#each teaching as item, i}
            <div class="course-card">
              <div class="course-head">
                <strong>Course {i + 1}</strong>
                {#if teaching.length > 1}
                  <button class="act-remove" onclick={() => removeTeaching(i)}>Remove</button>
                {/if}
              </div>
              <div class="field-grid">
                <label>Course code<input bind:value={item.courseCode} oninput={() => scheduleTeachingSave()} placeholder="CSE-301" /></label>
                <label>Course name<input bind:value={item.courseName} oninput={() => scheduleTeachingSave()} placeholder="Database Management Systems" /></label>
                <label>Program / level<input bind:value={item.programLevel} oninput={() => scheduleTeachingSave()} placeholder="B.Tech · III Year" /></label>
                <label>Class type<select bind:value={item.classType} onchange={() => scheduleTeachingSave()}><option>Lecture</option><option>Lab</option><option>Tutorial</option><option>Seminar</option></select></label>
              </div>
              <div class="number-grid">
                <label>Scheduled<input type="number" min="0" bind:value={item.scheduled} oninput={() => scheduleTeachingSave()} placeholder="0" /></label>
                <label>Conducted<input type="number" min="0" bind:value={item.conducted} oninput={() => scheduleTeachingSave()} placeholder="0" /></label>
                <label>Missed<input type="number" min="0" bind:value={item.missed} oninput={() => scheduleTeachingSave()} placeholder="0" /></label>
                <label>Syllabus %<input type="number" min="0" max="100" bind:value={item.syllabusCompletion} oninput={() => scheduleTeachingSave()} placeholder="0" /></label>
              </div>
              <label class="missed-label">Action taken for missed classes<input bind:value={item.missedAction} oninput={() => scheduleTeachingSave()} placeholder="e.g. Makeup class scheduled" /></label>
            </div>
          {/each}
          <button class="act-add" onclick={addTeaching}>+ Add course</button>
        </div>
      {:else if activeSection === 'research'}
        <div class="section-top"><h2>Research & publications</h2></div>
        {#each researchRecords as item, i}
          <div class="record-card">
            <div class="course-head">
              <strong>Record {i + 1}</strong>
              {#if researchRecords.length > 1}
                <button class="act-remove" onclick={() => removeResearch(i)}>Remove</button>
              {/if}
            </div>
            <div class="field-grid">
              <label>Category<select bind:value={item.category} onchange={() => scheduleSave('research')}><option>Journal Paper</option><option>Patent</option><option>Research Grant</option><option>Conference / FDP</option></select></label>
              <label>Title<input bind:value={item.title} oninput={() => scheduleSave('research')} placeholder="Title of paper, patent or project" /></label>
              <label>Venue / agency<input bind:value={item.venueOrAgency} oninput={() => scheduleSave('research')} placeholder="Journal name, conference, or funding body" /></label>
              <label>Indexing / quality<input bind:value={item.indexingOrQuality} oninput={() => scheduleSave('research')} placeholder="SCI, Scopus, UGC, etc." /></label>
              <label>Role<input bind:value={item.role} oninput={() => scheduleSave('research')} placeholder="Lead author, Co-author, PI" /></label>
              <label>Status<input bind:value={item.status} oninput={() => scheduleSave('research')} placeholder="In progress, submitted, published" /></label>
            </div>
          </div>
        {:else}
          <p class="empty-hint">No research records yet. Add papers, patents, grants, or conferences you worked on this week.</p>
        {/each}
        <div class="record-acts">
          <button class="act-add" onclick={() => (researchRecords = [...researchRecords, { category: 'Journal Paper', title: '', venueOrAgency: '', indexingOrQuality: '', role: '', status: '' }])}>+ Add record</button>
          <button class="act-link" onclick={() => saveActivity('research')}>{additionalSaving ? 'Saving…' : 'Save research'}</button>
        </div>
      {:else if activeSection === 'duties'}
        {#each dutiesRecords as item, i}
          <div class="record-card">
            <div class="course-head">
              <strong>Duty {i + 1}</strong>
              {#if dutiesRecords.length > 1}
                <button class="act-remove" onclick={() => removeDuty(i)}>Remove</button>
              {/if}
            </div>
            <div class="field-grid">
              <label>Committee / body<input bind:value={item.name} oninput={() => scheduleSave('duties')} placeholder="e.g. Exam Cell, NAAC, IQAC" /></label>
              <label>Role<input bind:value={item.role} oninput={() => scheduleSave('duties')} placeholder="e.g. Member, Convenor, Coordinator" /></label>
              <label>Activity<input bind:value={item.activity} oninput={() => scheduleSave('duties')} placeholder="e.g. Invigilation, event coordination" /></label>
              <label>Reach / scope<input bind:value={item.reach} oninput={() => scheduleSave('duties')} placeholder="Institute-wide, department, etc." /></label>
              <label>Outcome<input bind:value={item.outcome} oninput={() => scheduleSave('duties')} placeholder="e.g. Completed, report submitted" /></label>
            </div>
          </div>
        {:else}
          <p class="empty-hint">No institutional duties yet. Add committees, events, or responsibilities you took on this week.</p>
        {/each}
        <div class="record-acts">
          <button class="act-add" onclick={() => (dutiesRecords = [...dutiesRecords, { name: '', role: '', activity: '', reach: '', outcome: '' }])}>+ Add duty</button>
          <button class="act-link" onclick={() => saveActivity('duties')}>{additionalSaving ? 'Saving…' : 'Save duties'}</button>
        </div>
      {:else if activeSection === 'summary'}
        <div class="section-top">
          <h2>Weekly Executive Summary & Dashboard</h2>
        </div>
        <div class="auto-summary">{autoSummary}</div>
        <div class="dash-summary">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Monthly Target</th>
                <th>Actual Achieved</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Classes Scheduled vs. Taken</td>
                <td>{scheduled}</td>
                <td>{conducted} / {scheduled}</td>
                <td class="status-cell">{deliveryRate >= 90 ? '✓' : deliveryRate >= 70 ? '△' : '⚠'}</td>
              </tr>
              <tr>
                <td>Lecture Delivery Rate (%)</td>
                <td>100%</td>
                <td>{deliveryRate}%</td>
                <td class="status-cell">{deliveryRate >= 90 ? '✓' : deliveryRate >= 70 ? '△' : '⚠'}</td>
              </tr>
              <tr>
                <td>Research Papers / Patents Active</td>
                <td>—</td>
                <td>{researchActive}</td>
                <td class="status-cell">{researchActive > 0 ? '✓' : '—'}</td>
              </tr>
              <tr>
                <td>Club & Institutional Events Led</td>
                <td>—</td>
                <td>{dutiesCount}</td>
                <td class="status-cell">{dutiesCount > 0 ? '✓' : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      {:else if activeSection === 'additional'}
        <div class="sub-tabs">
          <button class:active={activeExtraSection === 'attachments'} onclick={() => (activeExtraSection = 'attachments')}>Files ({attachments.length})</button>
          <button class:active={activeExtraSection === 'outreach'} onclick={() => (activeExtraSection = 'outreach')}>Outreach</button>
        </div>
        {#if activeExtraSection === 'attachments'}
          <div class="section-top"><h2>Supporting files</h2></div>
          <div class="attach-list">
            {#each attachments as a}
              <div class="attach-row">
                <div class="attach-info">
                  <strong>{fileName(a.filename)}</strong>
                  <small>{formatSize(a.size)} · {new Date(a.created_at).toLocaleDateString()}</small>
                </div>
                <div class="attach-acts">
                  <a href="/api/attachments/{a.id}" download>Download</a>
                  {#if canEdit}<button class="act-remove" onclick={() => deleteAttachment(a.id)}>Delete</button>{/if}
                </div>
              </div>
            {:else}
              <p class="empty">No files uploaded yet.</p>
            {/each}
          </div>
          {#if canEdit}
            <label class="upload-btn">+ Upload file<input disabled={!canEdit} type="file" accept="application/pdf,image/png,image/jpeg" onchange={uploadEvidence} /></label>
          {/if}
        {:else if activeExtraSection === 'outreach'}
          <div class="section-top"><h2>Outreach & admissions</h2></div>
          {#each outreachRecords as item, i}
            <div class="record-card">
              <div class="course-head">
                <strong>Outreach {i + 1}</strong>
                {#if outreachRecords.length > 1}
                  <button class="act-remove" onclick={() => removeOutreach(i)}>Remove</button>
                {/if}
              </div>
              <div class="field-grid">
                <label>Activity<input bind:value={item.activity} oninput={() => scheduleSave('outreach')} placeholder="e.g. School visit, counselling drive" /></label>
                <label>Audience<input bind:value={item.audience} oninput={() => scheduleSave('outreach')} placeholder="e.g. Students, parents, industry" /></label>
                <label>Date<input type="date" bind:value={item.date} onchange={() => scheduleSave('outreach')} /></label>
                <label>Outcome<input bind:value={item.outcome} oninput={() => scheduleSave('outreach')} placeholder="e.g. Registrations, queries resolved" /></label>
              </div>
            </div>
          {:else}
            <p class="empty-hint">No outreach activity yet. Add visits, drives, or events you were part of this week.</p>
          {/each}
          <div class="record-acts">
            <button class="act-add" onclick={() => (outreachRecords = [...outreachRecords, { activity: '', audience: '', outcome: '', date: '' }])}>+ Add outreach</button>
            <button class="act-link" onclick={() => saveActivity('outreach')}>{additionalSaving ? 'Saving…' : 'Save outreach'}</button>
          </div>
        {/if}
      {/if}
    </section>
  </div>
</main>

<style>
  .shell { max-width: 1200px; }
  .editor-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 12px; }
  .editor-head-left { display: flex; align-items: center; gap: 12px; }
  .editor-head-left h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0; }
  .head-period { font-size: 0.82rem; color: #667477; }
  .status-pill { font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 5px; letter-spacing: 0.02em; }
  .status-pill.draft { background: #f0d48a; color: #7a6420; }
  .status-pill.submitted { background: #8bbdd9; color: #1a5a7a; }
  .status-pill.approved { background: #7fbf97; color: #1a5a3a; }
  .status-pill.changes { background: #e09080; color: #7a3028; }
  .editor-actions { display: flex; align-items: center; gap: 8px; }
  .save-note { font-size: 0.72rem; color: #87969c; white-space: nowrap; }
  .act-link { border: 1px solid #dbe3e7; border-radius: 6px; padding: 7px 12px; background: #fdfcf9; color: #145b78; font: inherit; font-size: 0.73rem; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; transition: all 0.12s; }
  .act-link:hover { background: #e5f0f4; border-color: #bdd3db; }
  .act-submit { border: 1px solid #17252d; border-radius: 6px; padding: 7px 14px; background: #17252d; color: #f4f6f5; font: inherit; font-size: 0.73rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.12s; }
  .act-submit:hover { background: #294a5a; }
  .act-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .act-remove { border: 1px solid #e8d4d4; border-radius: 5px; padding: 5px 9px; background: #fdfcf9; color: #a84f42; font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
  .act-remove:hover { background: #fdf0ef; }
  .act-add { border: 1px solid #dbe3e7; border-radius: 6px; padding: 9px 14px; background: #e5f0f4; color: #145b78; font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.12s; }
  .act-add:hover { background: #d0e5ec; }
  .progress-track { height: 4px; background: #dbe3e7; border-radius: 2px; overflow: hidden; margin-bottom: 24px; }
  .progress-track i { display: block; height: 100%; background: #145b78; border-radius: 2px; transition: width 0.3s ease; }
  .success-banner, .state-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 7px; font-size: 0.82rem; margin-bottom: 16px; flex-wrap: wrap; }
  .success-banner { background: #7fbf971a; border: 1px solid #7fbf9766; color: #1a5a3a; }
  .state-banner.locked { background: #f0d48a1a; border: 1px solid #f0d48a66; color: #7a6420; }
  .state-banner.changes { background: #e090801a; border: 1px solid #e0908066; color: #7a3028; }
  .success-banner a, .state-banner a { color: #145b78; text-decoration: none; font-weight: 700; }
  .overlay { position: fixed; inset: 0; background: rgba(23, 37, 45, 0.35); display: grid; place-items: center; z-index: 100; }
  .confirm-dialog { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 10px; padding: 28px; max-width: 400px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
  .confirm-dialog h3 { margin: 0 0 8px; font-size: 1.1rem; color: #1b2b36; }
  .confirm-dialog p { margin: 0 0 20px; color: #71818a; font-size: 0.84rem; line-height: 1.5; }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
  .review-box { margin-bottom: 20px; background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; padding: 12px 16px; }
  .review-box summary { cursor: pointer; font-size: 0.78rem; font-weight: 700; color: #667477; }
  .review-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e8eeec; font-size: 0.8rem; }
  .review-row:last-child { border-bottom: 0; }
  .review-pill { flex: none; padding: 3px 7px; border-radius: 4px; font-size: 0.62rem; font-weight: 800; align-self: start; }
  .rv-ok { background: #7fbf97; color: #1a5a3a; }
  .rv-chg { background: #e09080; color: #7a3028; }
  .review-body strong { display: block; font-size: 0.78rem; }
  .review-date { display: block; font-size: 0.68rem; color: #87969c; margin-top: 2px; }
  .review-body p { margin: 6px 0 0; color: #667477; font-size: 0.78rem; line-height: 1.4; }
  .editor-layout { display: grid; grid-template-columns: 200px 1fr; align-items: start; gap: 28px; }
  .section-nav { position: sticky; top: 20px; background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; padding: 12px; }
  .section-nav button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 10px; border: 0; border-radius: 6px; background: transparent; color: #667477; cursor: pointer; text-align: left; font: inherit; font-size: 0.78rem; transition: all 0.1s; }
  .section-nav button:hover, .section-nav button.active { background: #e5f0f4; color: #145b78; }
  .section-nav button.active { font-weight: 700; }
  .sn-num { font-size: 0.6rem; font-weight: 800; color: #a5b4b9; }
  .active .sn-num { color: #145b78; }
  .sn-count { margin-left: auto; font-size: 0.6rem; font-weight: 800; color: #a5b4b9; background: #eef3f5; padding: 1px 5px; border-radius: 4px; }
  .form-area { min-height: 300px; }
  .section-top { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-top h2 { font-size: 1.1rem; margin: 0; letter-spacing: -0.02em; }
  .metric-badge { font-size: 0.68rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; background: #7fbf97; color: #1a5a3a; }
  .course-list { display: grid; gap: 14px; }
  .course-card { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; padding: 18px; }
  .course-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .course-head strong { font-size: 0.82rem; color: #145b78; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .number-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
  .course-card label, .record-card label { display: block; color: #667477; font-size: 0.72rem; font-weight: 700; }
  .course-card input, .course-card select, .record-card input, .record-card select, .summary-area { display: block; width: 100%; box-sizing: border-box; margin-top: 5px; padding: 9px 10px; border: 1px solid #dbe3e7; border-radius: 5px; background: #fbfcfc; color: #1b2b36; font: inherit; font-size: 0.82rem; }
  .course-card input:focus, .course-card select:focus, .record-card input:focus, .record-card select:focus, .summary-area:focus { outline: 2px solid rgba(20, 91, 120, 0.2); border-color: #aacfd7; }
  .missed-label { display: block; color: #667477; font-size: 0.72rem; font-weight: 700; }
  .summary-area { border-radius: 6px; min-height: 160px; resize: vertical; }
  .sub-tabs { display: flex; gap: 2px; background: #eef3f5; border-radius: 6px; padding: 3px; margin-bottom: 20px; }
  .sub-tabs button { flex: 1; border: 0; background: transparent; padding: 8px 10px; border-radius: 4px; font: inherit; font-size: 0.74rem; color: #667477; cursor: pointer; transition: all 0.1s; }
  .sub-tabs button.active { background: #fdfcf9; color: #1b2b36; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .attach-list { display: grid; gap: 6px; margin-bottom: 14px; }
  .attach-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f4f6f5; border: 1px solid #dbe3e7; border-radius: 6px; }
  .attach-info { flex: 1; min-width: 0; }
  .attach-info strong { display: block; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .attach-info small { color: #87969c; font-size: 0.66rem; }
  .attach-acts { display: flex; gap: 8px; flex: none; }
  .attach-acts a { color: #145b78; text-decoration: none; font-size: 0.72rem; font-weight: 700; }
  .upload-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border: 1px dashed #bdd3db; border-radius: 6px; color: #667477; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: background 0.1s; }
  .upload-btn:hover { background: #eef3f5; }
  .upload-btn input { display: none; }
  .record-card { background: #f4f6f5; border: 1px solid #dbe3e7; border-radius: 8px; padding: 16px; margin-bottom: 10px; }
  .record-card .field-grid { margin-bottom: 0; }
  .record-acts { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 14px; }
  .empty { color: #87969c; font-size: 0.8rem; padding: 10px 0; }
  .empty-hint { color: #87969c; font-size: 0.8rem; background: #f4f6f5; border: 1px dashed #dbe3e7; border-radius: 8px; padding: 16px 18px; margin: 0 0 14px; }
  .preview-paper { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; padding: 28px; }
  .preview-kicker { font-size: 0.7rem; font-weight: 800; color: #145b78; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
  .preview-paper h2 { font-size: 1rem; margin: 16px 0 8px; }
  .preview-row { display: grid; grid-template-columns: 140px 1fr auto; gap: 14px; padding: 10px 0; border-bottom: 1px solid #e8eeec; font-size: 0.8rem; align-items: center; }
  .preview-row strong { color: #145b78; }
  .preview-stat { color: #667477; }
  .preview-text { background: #f4f6f5; border-radius: 6px; padding: 14px; font-size: 0.82rem; line-height: 1.5; color: #1b2b36; white-space: pre-wrap; }
  .preview-bar { display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: #eef3f5; border: 1px solid #dbe3e7; border-radius: 6px; margin-bottom: 16px; }
  .preview-bar strong { font-size: 0.8rem; color: #667477; }
  .auto-summary { background: #e5f0f4; border: 1px solid #bdd3db; border-radius: 6px; padding: 14px 18px; font-size: 0.82rem; line-height: 1.5; color: #1b2b36; margin-bottom: 16px; }
  .dash-summary { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .summary-table th { text-align: left; padding: 12px 16px; background: #eef3f5; color: #667477; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #dbe3e7; }
  .summary-table td { padding: 14px 16px; border-bottom: 1px solid #e8eeec; color: #1b2b36; }
  .summary-table tr:last-child td { border-bottom: 0; }
  .summary-table td:first-child { font-weight: 700; color: #145b78; }
  .summary-table td:nth-child(2),
  .summary-table td:nth-child(3) { font-variant-numeric: tabular-nums; text-align: center; }
  .status-cell { text-align: center; font-size: 1.1rem; font-weight: 800; color: #667477; }
  @media (max-width: 900px) {
    .editor-layout { grid-template-columns: 1fr; }
    .section-nav { position: static; display: flex; gap: 4px; }
    .section-nav button { flex: 1; justify-content: center; }
    .sn-count { display: none; }
  }
  @media (max-width: 700px) {
    .editor-head { flex-direction: column; align-items: start; }
    .editor-actions { flex-wrap: wrap; }
    .field-grid { grid-template-columns: 1fr; }
    .number-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 500px) {
    .number-grid { grid-template-columns: 1fr; }
    .preview-row { display: block; padding: 8px 0; }
  }
</style>