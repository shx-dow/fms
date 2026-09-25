<script lang="ts">
  import type { TeachingRecord } from '$lib/domain';
  import {
    autoSummary as buildAutoSummary,
    computeCompletion,
    countActive,
    isNotApplicable,
    reviewNotes as buildReviewNotes,
    STEPS,
    STEP_LABELS,
    stepDone as isStepDone,
    summariseTeaching,
    validStep,
    type Step,
  } from '$lib/report-progress';
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/state';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import ReportPreview from '$lib/components/ReportPreview.svelte';
  import StepFiles from '$lib/components/StepFiles.svelte';
  import StepRecords from '$lib/components/StepRecords.svelte';
  import StepTeaching from '$lib/components/StepTeaching.svelte';
  import {
    BLANK_DUTY,
    BLANK_OUTREACH,
    BLANK_RESEARCH,
    type DutyRecord,
    type OutreachRecord,
    type ResearchRecord,
  } from '$lib/report-records';
  import Modal from '$lib/components/Modal.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  let { data } = $props();

  let activeSection: Step = $state(validStep(page.url.searchParams.get('step')) ?? 'teaching');
  let submitted = $state(false);
  let savedAt = $state('');
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let teachingSaveTimer: ReturnType<typeof setTimeout> | undefined;
  // Seeded from the server load; the page then owns these as the teacher edits.
  const seed = () => data;
  let canEdit = $state(seed().canEdit);
  let periodLabel = $state(seed().periodLabel);
  let reportId = $state(seed().reportId);
  let reportStatus = $state(seed().reportStatus);
  let teaching: TeachingRecord[] = $state(
    seed().teaching.length
      ? seed().teaching
      : [{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }],
  );
  let saving = $state(false);
  let confirmSubmit = $state(false);
  let confirmCopy = $state(false);
  let confirmTemplate = $state(false);
  let history: (typeof data.history)[number][] = $state(seed().history);
  let reviews: { decision: string; remarks: string | null; created_at: string; reviewer_name: string }[] = $state(seed().reviews);
  let attachments: (typeof data.attachments)[number][] = $state(seed().attachments);
  let researchRecords: ResearchRecord[] = $state(seed().research);
  let dutiesRecords: DutyRecord[] = $state(seed().duties);
  let outreachRecords: OutreachRecord[] = $state(seed().outreach);
  let researchEmpty = $state(seed().researchEmpty);
  let dutiesEmpty = $state(seed().dutiesEmpty);
  let outreachEmpty = $state(seed().outreachEmpty);
  let additionalSaving = $state(false);
  let saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let deadlineDate = $state(seed().deadline);
  let hasTemplate = $state(seed().hasTemplate);
  let canSubmit = $derived(Boolean(deadlineDate && new Date(deadlineDate) > new Date()));

  const teachingSummary = $derived(summariseTeaching(teaching));
  let scheduled = $derived(teachingSummary.scheduled);
  let conducted = $derived(teachingSummary.conducted);
  let deliveryRate = $derived(teachingSummary.deliveryRate);
  let syllabusLecture = $derived(teachingSummary.syllabusLecture);
  let hasValidTeaching = $derived(teachingSummary.hasValidTeaching);
  let teachingValid = $derived(teachingSummary.teachingValid);
  let researchNA = $derived(isNotApplicable(researchRecords, (r) => r.title, researchEmpty));
  let dutiesNA = $derived(isNotApplicable(dutiesRecords, (d) => d.name, dutiesEmpty));
  let outreachNA = $derived(isNotApplicable(outreachRecords, (r) => r.activity, outreachEmpty));
  let researchActive = $derived(countActive(researchRecords, (r) => r.title));
  let dutiesCount = $derived(countActive(dutiesRecords, (d) => d.name));
  let outreachCount = $derived(countActive(outreachRecords, (r) => r.activity));
  let hasResearch = $derived(researchActive > 0);
  let hasDuties = $derived(dutiesCount > 0);
  const progressInput = $derived({
    teaching: teachingSummary,
    researchActive,
    dutiesCount,
    outreachCount,
    attachmentCount: attachments.length,
    researchNA,
    dutiesNA,
    outreachNA,
  });
  let completion = $derived(computeCompletion(progressInput));
  let autoSummary = $derived(
    buildAutoSummary({ ...progressInput, courseCount: teaching.filter((t) => t.courseCode?.trim()).length }),
  );
  let isReadonly = $derived(!canEdit && reportStatus !== 'CHANGES_REQUIRED');
  let prevReport = $derived(history.find(r => r.id !== reportId));
  let prevReportLabel = $derived(prevReport?.period_label ?? '');
  let latestReview = $derived(reviews.find(r => r.decision === 'CHANGES_REQUIRED'));
  const stepIndex = $derived(STEPS.indexOf(activeSection));
  function goStep(s: Step) {
    activeSection = s;
    window.scrollTo({ top: 0 });
  }
  function nextStep() {
    if (stepIndex < STEPS.length - 1) goStep(STEPS[stepIndex + 1]);
  }
  function prevStep() {
    if (stepIndex > 0) goStep(STEPS[stepIndex - 1]);
  }
  const reviewNotes = $derived(buildReviewNotes(progressInput));
  function stepDone(s: Step): boolean {
    return isStepDone(s, progressInput);
  }
  onMount(() => {
    // The report, its records, reviews, attachments, and template all arrive
    // with the page; nothing is fetched on mount.
    savedAt = '';
  });
  onDestroy(() => { clearTimeout(saveTimer); clearTimeout(teachingSaveTimer); Object.values(saveTimers).forEach(clearTimeout); Object.values(removalTimers).forEach(clearTimeout); });
  function flashSaved() {
    clearTimeout(saveTimer);
    savedAt = 'Draft Saved';
    saveTimer = setTimeout(() => { savedAt = ''; }, 3000);
  }
  async function loadAttachments() {
    try { const r = await fetch(`/api/attachments?reportId=${reportId}`); const d = await r.json(); attachments = d.attachments ?? []; }
    catch { show('Could not load attachments.', 'err'); }
  }
  async function uploadEvidence(e: Event) {
    // SAFETY: The change event fires on the file input element itself, so currentTarget is that input.
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
  async function saveDraft(status = 'DRAFT') {
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
  async function saveActivity(kind: 'research' | 'duties' | 'outreach', records?: any[], empty?: boolean) {
    if (!reportId || !canEdit || additionalSaving) return;
    additionalSaving = true; clearTimeout(saveTimer); savedAt = 'Saving...';
    const body = {
      reportId,
      records: records ?? (kind === 'research' ? researchRecords : kind === 'duties' ? dutiesRecords : outreachRecords),
      empty,
    };
    const res = await fetch(`/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    additionalSaving = false;
    if (!res.ok) { show('Save failed.', 'err'); savedAt = ''; return; }
    if (empty !== undefined) {
      if (kind === 'research') researchEmpty = empty;
      if (kind === 'duties') dutiesEmpty = empty;
      if (kind === 'outreach') outreachEmpty = empty;
    }
    flashSaved();
  }
  async function setNotApplicable(kind: 'research' | 'duties' | 'outreach') {
    const current = kind === 'research' ? researchEmpty : kind === 'duties' ? dutiesEmpty : outreachEmpty;
    if (kind === 'research') researchRecords = [];
    if (kind === 'duties') dutiesRecords = [];
    if (kind === 'outreach') outreachRecords = [];
    await saveActivity(kind, [], !current);
  }

  function addTeaching() { teaching = [...teaching, { courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }]; scheduleTeachingSave(); }
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
  async function handleSubmit() { confirmSubmit = false; const ok = await saveDraft('SUBMITTED'); if (ok) { submitted = true; reportStatus = 'SUBMITTED'; canEdit = false; } }
  async function copyFromLastWeek() {
    confirmCopy = false;
    if (!prevReport) { show('No previous report to copy from.', 'err'); return; }
    try {
      const res = await fetch(`/api/reports/${prevReport.id}`);
      const d = await res.json();
      if (!res.ok) { show(d.error ?? 'Could not load last week\u2019s report.', 'err'); return; }
      teaching = (d.teaching ?? []).map((t: any) => ({ courseCode: t.course_code, courseName: t.course_name, programLevel: t.program_level, classType: t.class_type, scheduled: Number(t.scheduled ?? 0), conducted: 0, missed: 0, missedAction: '', syllabusCompletion: t.syllabus_completion ?? 0, syllabusLecture: t.syllabus_lecture ?? 0 }));
      researchRecords = (d.research ?? []).map((r: any) => ({ category: r.category, title: r.title, venueOrAgency: r.venue_or_agency ?? '', indexingOrQuality: r.indexing_or_quality ?? '', role: r.role ?? '', status: r.status ?? '' }));
      dutiesRecords = (d.duties ?? []).map((r: any) => ({ name: r.name, role: r.role, activity: r.activity ?? '', reach: r.reach ?? '', outcome: r.outcome ?? '' }));
      outreachRecords = (d.outreach ?? []).map((r: any) => ({ activity: r.activity, audience: r.audience ?? '', outcome: r.outcome ?? '', date: r.date ?? '' }));
      if (!teaching.length) teaching = [{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }];
      await saveDraft();
      await saveActivity('research');
      await saveActivity('duties');
      await saveActivity('outreach');
      show(`Copied from ${prevReportLabel}. Update the numbers for this week.`);
    } catch { show('Could not load last week\u2019s report.', 'err'); }
  }
  async function loadRecurringTemplate() {
    confirmTemplate = false;
    // The template already arrived with the page; no fetch needed.
    const t = data.template;
    teaching = t.subjects.map((subject) => ({
      courseCode: String(subject['courseCode'] ?? ''),
      courseName: String(subject['courseName'] ?? ''),
      programLevel: String(subject['programLevel'] ?? ''),
      classType: String(subject['classType'] ?? 'Lecture'),
      scheduled: Number(subject['scheduled'] ?? 0),
      conducted: 0,
      missed: 0,
      missedAction: '',
      syllabusCompletion: 0,
      syllabusLecture: 0,
    }));
    researchRecords = t.research.map((r) => ({ ...BLANK_RESEARCH, ...r }));
    dutiesRecords = t.duties.map((d) => ({ ...BLANK_DUTY, ...d }));
    outreachRecords = t.outreach.map((o) => ({ ...BLANK_OUTREACH, ...o }));
    if (!teaching.length) teaching = [{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }];
    await saveDraft();
    await saveActivity('research');
    await saveActivity('duties');
    await saveActivity('outreach');
    show('Recurring template loaded.');
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
      <StatusPill status={reportStatus} detail={`${completion}%`} />
    </div>
    <div class="editor-actions">
      <NotificationBell />
      <span class="save-note">{savedAt}</span>
      {#if !isReadonly}
        <a class="btn" href="/dashboard">← Dashboard</a>
      {/if}
    </div>
  </header>
  <div class="progress-track"><i style="width:{completion}%"></i></div>

  {#if confirmSubmit}
    <Modal title="Submit this report?" size="sm" onclose={() => (confirmSubmit = false)}>
      <p class="modal-note">Once submitted you will not be able to edit it unless an HOD or Admin reopens it.</p>
      <div class="modal-acts">
        <button class="btn" onclick={() => (confirmSubmit = false)}>Cancel</button>
        <button class="btn btn-primary" disabled={!canSubmit} onclick={handleSubmit}>Confirm →</button>
      </div>
    </Modal>
  {/if}

  {#if confirmCopy}
    <Modal title="Copy from last week?" size="sm" onclose={() => (confirmCopy = false)}>
      <p class="modal-note">This will replace all the data you currently have across all sections (Teaching, Research, Duties, Outreach) with the report from {prevReportLabel}. Do you still want to copy?</p>
      <div class="modal-acts">
        <button class="btn" onclick={() => (confirmCopy = false)}>Cancel</button>
        <button class="btn btn-primary" onclick={copyFromLastWeek}>Copy →</button>
      </div>
    </Modal>
  {/if}

  {#if confirmTemplate}
    <Modal title="Load recurring template?" size="sm" onclose={() => (confirmTemplate = false)}>
      <p class="modal-note">This will replace all currently filled report data across Teaching, Research, Duties, and Outreach. Any weekly changes you have entered will be removed.</p>
      <div class="modal-acts">
        <button class="btn" onclick={() => (confirmTemplate = false)}>Cancel</button>
        <button class="btn btn-primary" onclick={loadRecurringTemplate}>Replace with template</button>
      </div>
    </Modal>
  {/if}

  {#if reviews.length > 0}
    <details class="review-box">
      <summary>Review history ({reviews.length})</summary>
      {#each reviews as rv}
        <div class="review-row">
          <StatusPill status={rv.decision} />
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
    {#if !isReadonly}
      <ol class="steps" aria-label="Report sections">
        {#each STEPS as s, n}
          <li>
            <button
              class="step"
              class:current={activeSection === s}
              class:done={stepDone(s)}
              onclick={() => goStep(s)}
              aria-current={activeSection === s ? 'step' : undefined}
            >
              <span class="step-num">{stepDone(s) && activeSection !== s ? '✓' : `0${n + 1}`}</span>
              <span class="step-label">{STEP_LABELS[s]}</span>
            </button>
          </li>
          {#if n < STEPS.length - 1}<li class="step-sep" aria-hidden="true"></li>{/if}
        {/each}
      </ol>
    {/if}

    <section class="form-area">
      {#if isReadonly}
        <div class="preview-paper">
          <div class="preview-kicker">Faculty weekly report · {periodLabel}</div>
          <h2>Teaching & academic delivery</h2>
          {#each teaching as item}
            <div class="preview-row">
              <strong>{item.courseCode || 'Untitled'}</strong>
              <span>{item.courseName || 'Course name pending'}</span>
              <span class="preview-stat">{item.conducted} / {item.scheduled} classes · up to lecture {item.syllabusLecture || '—'}</span>
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
      {:else if activeSection === 'teaching'}
        <StepTeaching
          bind:teaching
          {deliveryRate}
          {hasValidTeaching}
          {isReadonly}
          {hasTemplate}
          {prevReportLabel}
          onchange={scheduleTeachingSave}
          onadd={addTeaching}
          onremove={removeTeaching}
          onloadtemplate={() => (confirmTemplate = true)}
          oncopy={() => (confirmCopy = true)}
        />
      {:else if activeSection === 'research'}
        <StepRecords
          section="research"
          bind:records={researchRecords}
          notApplicable={researchNA}
          saving={additionalSaving}
          ontoggleNA={() => setNotApplicable('research')}
          onadd={() => (researchRecords = [...researchRecords, { ...BLANK_RESEARCH }])}
          onremove={removeResearch}
          onchange={() => scheduleSave('research')}
          onsave={() => saveActivity('research')}
        />
      {:else if activeSection === 'duties'}
        <StepRecords
          section="duties"
          bind:records={dutiesRecords}
          notApplicable={dutiesNA}
          saving={additionalSaving}
          ontoggleNA={() => setNotApplicable('duties')}
          onadd={() => (dutiesRecords = [...dutiesRecords, { ...BLANK_DUTY }])}
          onremove={removeDuty}
          onchange={() => scheduleSave('duties')}
          onsave={() => saveActivity('duties')}
        />
      {:else if activeSection === 'outreach'}
        <StepRecords
          section="outreach"
          bind:records={outreachRecords}
          notApplicable={outreachNA}
          saving={additionalSaving}
          ontoggleNA={() => setNotApplicable('outreach')}
          onadd={() => (outreachRecords = [...outreachRecords, { ...BLANK_OUTREACH }])}
          onremove={removeOutreach}
          onchange={() => scheduleSave('outreach')}
          onsave={() => saveActivity('outreach')}
        />
      {:else if activeSection === 'files'}
        <StepFiles {attachments} {canEdit} onupload={uploadEvidence} ondelete={deleteAttachment} />
      {:else if activeSection === 'review'}
        <div class="section-top"><h2>Review & submit</h2></div>
        <p class="section-hint">Check everything below, then submit. A submitted report locks until your HOD reopens it.</p>
        {#if !isReadonly}
          <div class="speed-row">
            {#if prevReport}<button class="btn" onclick={() => (confirmCopy = true)} title={`Fill this report from ${prevReportLabel}`}>Copy from {prevReportLabel}</button>{/if}
            <button class="btn" onclick={() => (confirmTemplate = true)} title="Replace this report with your recurring template">Load recurring template</button>
            <a class="btn" href="/api/reports/{reportId}/pdf" target="_blank">PDF</a>
            <a class="btn" href="/api/reports/current/export">CSV</a>
          </div>
        {/if}
        {#if reviewNotes.length}
          <div class="issues" aria-label="Things to check">
            {#each reviewNotes as n}
              <button class="issue" class:err={n.level === 'error'} onclick={() => goStep(n.step)}>
                <span class="issue-ic" aria-hidden="true">{n.level === 'error' ? '!' : '○'}</span>
                <span class="issue-text">{n.text}</span>
                <span class="issue-go">Fix →</span>
              </button>
            {/each}
          </div>
        {:else}
          <div class="issues-ok">Everything looks complete. Ready when you are.</div>
        {/if}
        <div class="auto-summary">{autoSummary}</div>
        <div class="summary-grid">
          <div class="summary-metric primary"><span>Teaching delivery</span><strong>{conducted}<small> / {scheduled} classes</small></strong><em>{deliveryRate}% delivery</em></div>
          <div class="summary-metric"><span>Research</span><strong>{researchNA ? 'N/A' : researchActive}</strong><em>{researchNA ? 'no activity recorded' : researchActive === 1 ? 'item this week' : 'items this week'}</em></div>
          <div class="summary-metric"><span>Institutional duties</span><strong>{dutiesNA ? 'N/A' : dutiesCount}</strong><em>{dutiesNA ? 'no activity recorded' : dutiesCount === 1 ? 'item this week' : 'items this week'}</em></div>
          <div class="summary-metric"><span>Outreach</span><strong>{outreachNA ? 'N/A' : outreachCount}</strong><em>{outreachNA ? 'no activity recorded' : outreachCount === 1 ? 'item this week' : 'items this week'}</em></div>
          <div class="summary-metric"><span>Supporting files</span><strong>{attachments.length}</strong><em>{attachments.length === 1 ? 'file attached' : 'files attached'}</em></div>
        </div>
        <ReportPreview
          kicker="Faculty weekly report · {periodLabel}"
          teaching={teaching
            .filter((t) => t.courseCode?.trim() || t.courseName?.trim())
            .map((item) => ({
              title: item.courseCode || 'Untitled',
              sub: item.courseName || 'Course name pending',
              meta: `${item.conducted} / ${item.scheduled} classes · up to lecture ${item.syllabusLecture || '—'}`,
            }))}
          research={researchRecords
            .filter((r) => r.title?.trim() && r.title !== 'N/A')
            .map((item) => ({
              title: item.title,
              sub: item.category,
              meta: `${item.status || '—'}${item.venueOrAgency ? ` · ${item.venueOrAgency}` : ''}`,
            }))}
          duties={dutiesRecords
            .filter((d) => d.name?.trim() && d.name !== 'N/A')
            .map((item) => ({ title: item.name, sub: item.role, meta: item.activity }))}
          outreach={outreachRecords
            .filter((r) => r.activity?.trim() && r.activity !== 'N/A')
            .map((item) => ({ title: item.activity, sub: item.audience, meta: item.date }))}
          summary={autoSummary}
        />
        {#if !isReadonly}
          <div class="review-submit">
            <button
              class="act-submit big"
              disabled={!canEdit || saving || !canSubmit}
              title={!canSubmit ? `Submissions close ${new Date(deadlineDate).toLocaleString()}` : ''}
              onclick={() => (confirmSubmit = true)}>Submit report →</button>
            {#if !canSubmit}<p class="submit-note">Submissions are closed for this period.</p>{/if}
          </div>
        {/if}
      {/if}
    </section>
    {#if !isReadonly}
      <div class="wizard-nav">
        {#if stepIndex > 0}
          <button class="btn" onclick={prevStep}>← Back</button>
        {:else}
          <span></span>
        {/if}
        {#if activeSection !== 'review'}
          <button class="act-submit" onclick={nextStep}>Continue →</button>
        {:else}
          <button class="btn" onclick={() => goStep('files')}>← Review files</button>
        {/if}
      </div>
    {/if}
  </div>
</main>

<style>
  .empty { color: var(--muted-2); font-size: 0.84rem; padding: 10px 0; }
  .shell { max-width: 1200px; }
  .editor-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 14px; position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, var(--paper) 88%, white); backdrop-filter: blur(10px); padding: 14px 18px; margin-inline: -18px; border-bottom: 1px solid var(--line); }
  .editor-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .editor-head-left h1 { font-size: 1.5rem; letter-spacing: -0.03em; margin: 0; font-weight: 750; color: var(--text-1); }
  .head-period { font-size: 0.84rem; color: var(--text-3); white-space: nowrap; }
  .editor-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .save-note { font-size: 0.74rem; color: var(--muted-2); white-space: nowrap; min-width: 86px; text-align: right; font-weight: 600; }
  .act-submit { border: 1px solid var(--navy); border-radius: 7px; padding: 9px 17px; background: var(--navy); color: var(--paper); font: inherit; font-size: 0.78rem; font-weight: 750; cursor: pointer; white-space: nowrap; box-shadow: var(--shadow-sm); transition: all 0.12s; }
  .act-submit:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .act-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .progress-track { height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; margin-bottom: 26px; box-shadow: inset 0 1px 2px rgba(15,23,42,0.06); }
  .progress-track i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--blue-dark)); border-radius: 999px; transition: width 0.3s ease; }
  .success-banner, .state-banner { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-radius: var(--radius-md); font-size: 0.84rem; margin-bottom: 16px; flex-wrap: wrap; box-shadow: var(--shadow-xs); border: 1px solid; }
  .success-banner { background: #f2f9f4; border-color: var(--success-border); color: var(--green); }
  .state-banner.locked { background: #fdf8e7; border-color: var(--draft-border); color: var(--warn-dark); }
  .state-banner.changes { background: var(--red-bg-alt); border-color: var(--red-border); color: var(--red-dark); }
  .success-banner a, .state-banner a { color: var(--blue); text-decoration: none; font-weight: 700; }
  .modal-note { margin: 0 0 20px; color: var(--muted-3); font-size: 0.84rem; line-height: 1.5; }
  .modal-acts { display: flex; justify-content: flex-end; gap: 10px; }
  .review-box { margin-bottom: 20px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px; }
  .review-box summary { cursor: pointer; font-size: 0.78rem; font-weight: 700; color: var(--muted); }
  .review-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line-2); font-size: 0.8rem; }
  .review-row:last-child { border-bottom: 0; }
  .review-body strong { display: block; font-size: 0.78rem; }
  .review-date { display: block; font-size: 0.68rem; color: var(--muted-2); margin-top: 2px; }
  .review-body p { margin: 6px 0 0; color: var(--muted); font-size: 0.78rem; line-height: 1.4; }
  .editor-layout { display: block; }
  .steps { display: flex; align-items: stretch; gap: 4px; list-style: none; margin: 0 0 26px; padding: 14px 16px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); overflow-x: auto; }
  .steps li { display: flex; align-items: stretch; }
  .step { display: flex; align-items: center; gap: 9px; border: 0; background: transparent; padding: 8px 12px; border-radius: 8px; cursor: pointer; font: inherit; white-space: nowrap; color: var(--muted); transition: background 0.12s ease; }
  .step:hover { background: var(--bg-hover); }
  .step-num { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 0.68rem; font-weight: 800; background: var(--bg-hover); border: 1px solid var(--line); color: var(--muted-2); flex: none; }
  .step.current .step-num { background: var(--navy); border-color: var(--navy); color: var(--paper); }
  .step.done .step-num { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .step-label { font-size: 0.8rem; font-weight: 600; }
  .step.current .step-label { color: var(--text-1); font-weight: 800; }
  .step-sep { flex: 1; min-width: 12px; align-self: center; height: 1px; background: var(--line); }
  .form-area { min-height: 300px; min-width: 0; max-width: 880px; }
  .wizard-nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; max-width: 880px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); }
  .speed-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .issues { display: grid; gap: 8px; margin-bottom: 18px; }
  .issue { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; padding: 12px 15px; border-radius: var(--radius-md); border: 1px solid var(--draft-border); background: #fdf8e7; color: var(--warn-dark); font: inherit; font-size: 0.82rem; cursor: pointer; transition: box-shadow 0.12s ease; }
  .issue:hover { box-shadow: var(--shadow-sm); }
  .issue.err { border-color: var(--red-border); background: var(--red-bg-alt); color: var(--red-dark); }
  .issue-ic { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 0.7rem; font-weight: 800; flex: none; background: rgba(0, 0, 0, 0.06); }
  .issue-text { flex: 1; }
  .issue-go { flex: none; font-weight: 800; font-size: 0.76rem; }
  .issues-ok { padding: 13px 16px; border-radius: var(--radius-md); border: 1px solid var(--success-border); background: #f2f9f4; color: var(--green); font-size: 0.84rem; font-weight: 600; margin-bottom: 18px; }
  .review-submit { display: grid; gap: 8px; justify-items: center; margin-top: 24px; padding: 24px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
  .act-submit.big { font-size: 0.9rem; padding: 13px 34px; border-radius: 9px; }
  .submit-note { margin: 0; font-size: 0.78rem; color: var(--red-dark); }
  .section-top { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-top h2 { font-size: 1.18rem; margin: 0; letter-spacing: -0.02em; font-weight: 750; color: var(--text-1); }
  .section-hint { margin: -10px 0 18px; color: var(--muted-2); font-size: 0.82rem; line-height: 1.5; }
  .preview-paper { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 34px 36px; box-shadow: var(--shadow-sm); }
  .preview-kicker { font-size: 0.7rem; font-weight: 800; color: var(--accent); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid var(--line-2); }
  .preview-paper h2 { font-size: 1.02rem; margin: 22px 0 10px; letter-spacing: -0.01em; font-weight: 750; color: var(--text-1); }
  .preview-paper h2:first-of-type { margin-top: 0; }
  .preview-row { display: grid; grid-template-columns: 150px 1fr auto; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line-2); font-size: 0.84rem; align-items: center; }
  .preview-row strong { color: var(--text-1); font-weight: 750; }
  .preview-stat { color: var(--text-3); }
  .preview-text { background: var(--paper); border-radius: 6px; padding: 14px; font-size: 0.82rem; line-height: 1.5; color: var(--ink-2); white-space: pre-wrap; }
  .auto-summary { background: var(--bg-hover); border: 1px solid var(--blue-border); border-radius: 6px; padding: 14px 18px; font-size: 0.82rem; line-height: 1.5; color: var(--ink-2); margin-bottom: 16px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .summary-metric { min-height: 112px; display: flex; flex-direction: column; justify-content: space-between; padding: 16px 17px; background: var(--panel); border: 1px solid var(--line); border-radius: 9px; }
  .summary-metric.primary { background: var(--navy); border-color: var(--navy); color: var(--paper); }
  .summary-metric span { color: var(--muted); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .summary-metric.primary span { color: var(--blue-soft); }
  .summary-metric strong { color: var(--ink-2); font-size: 1.45rem; letter-spacing: -0.04em; }
  .summary-metric.primary strong { color: var(--paper); }
  .summary-metric strong small { font-size: 0.78rem; font-weight: 700; letter-spacing: 0; }
  .summary-metric em { color: var(--muted-2); font-size: 0.7rem; font-style: normal; }
  .summary-metric.primary em { color: var(--blue-soft); }
  @media (max-width: 900px) {
    .steps { padding: 10px 12px; }
    .step-label { display: none; }
    .step.current .step-label { display: inline; }
  }
  @media (max-width: 700px) {
    .editor-head { flex-direction: column; align-items: start; }
    .editor-actions { flex-wrap: wrap; }
    .summary-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 500px) {
    .preview-row { display: block; padding: 8px 0; }
    .summary-grid { grid-template-columns: 1fr; }
  }
</style>
