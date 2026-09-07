<script lang="ts">
  import type { TeachingRecord } from '$lib/domain';
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/state';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import ReportPreview from '$lib/components/ReportPreview.svelte';
  let { data } = $props();

  const STEPS = ['teaching', 'research', 'duties', 'outreach', 'files', 'review'] as const;
  type Step = (typeof STEPS)[number];
  function validStep(s: string | null): Step | null {
    // SAFETY: STEPS is a fixed readonly tuple; membership test narrows s to a valid Step.
    if (!(STEPS as readonly string[]).includes(s ?? '')) return null;
    // SAFETY: Returned only after the membership test above confirmed s is a member of STEPS.
    return s as Step;
  }
  let activeSection: Step = $state(validStep(page.url.searchParams.get('step')) ?? 'teaching');
  let submitted = $state(false);
  let savedAt = $state('');
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let teachingSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let canEdit = $state(true);
  let periodLabel = $state('');
  let reportId = $state('');
  let reportStatus = $state('DRAFT');
  let teaching: TeachingRecord[] = $state([{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }]);
  let saving = $state(false);
  let confirmSubmit = $state(false);
  let confirmCopy = $state(false);
  let confirmTemplate = $state(false);
  let history: any[] = $state([]);
  let reviews: { decision: string; remarks: string; created_at: string; reviewer_name: string }[] = $state([]);
  let attachments: { id: string; filename: string; mime_type: string; size: number; created_at: string }[] = $state([]);
  let researchRecords: any[] = $state([]);
  let dutiesRecords: any[] = $state([]);
  let outreachRecords: any[] = $state([]);
  let researchEmpty = $state(false);
  let dutiesEmpty = $state(false);
  let outreachEmpty = $state(false);
  let additionalSaving = $state(false);
  let saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let deadlineDate = $state('');
  let hasTemplate = $state(false);
  let canSubmit = $derived(Boolean(deadlineDate && new Date(deadlineDate) > new Date()));

  let scheduled = $derived(teaching.reduce((s, i) => s + Number(i.scheduled || 0), 0));
  let conducted = $derived(teaching.reduce((s, i) => s + Number(i.conducted || 0), 0));
  let deliveryRate = $derived(scheduled ? Math.round((conducted / scheduled) * 100) : 0);
  let syllabusLecture = $derived(Math.max(0, ...teaching.map((t) => Number(t.syllabusLecture || 0))));
  let hasValidTeaching = $derived(teaching.some(i => i.courseCode?.trim() && i.courseName?.trim()));
  let teachingValid = $derived(teaching.every(i => {
    if (!i.courseCode?.trim() && !i.courseName?.trim()) return true;
    return Number(i.conducted ?? 0) <= Number(i.scheduled ?? 0);
  }));
  let researchNA = $derived(researchEmpty || researchRecords.some(r => r.title === 'N/A'));
  let dutiesNA = $derived(dutiesEmpty || dutiesRecords.some(d => d.name === 'N/A'));
  let outreachNA = $derived(outreachEmpty || outreachRecords.some(r => r.activity === 'N/A'));
  let researchActive = $derived(researchRecords.filter(r => r.title?.trim() && r.title !== 'N/A').length);
  let dutiesCount = $derived(dutiesRecords.filter(d => d.name?.trim() && d.name !== 'N/A').length);
  let outreachCount = $derived(outreachRecords.filter(r => r.activity?.trim() && r.activity !== 'N/A').length);
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
  const STEP_LABELS = {
    teaching: 'Teaching',
    research: 'Research',
    duties: 'Duties',
    outreach: 'Outreach',
    files: 'Files',
    review: 'Review',
  } satisfies Record<Step, string>;
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
  function stepDone(s: Step): boolean {
    if (s === 'teaching') return hasValidTeaching;
    if (s === 'research') return researchActive > 0 || researchNA;
    if (s === 'duties') return dutiesCount > 0 || dutiesNA;
    if (s === 'outreach') return outreachCount > 0 || outreachNA;
    if (s === 'files') return attachments.length > 0;
    return reviewNotes.length === 0;
  }
  const teachOver = $derived(
    teaching
      .map((t, i) => ({
        i,
        over: Boolean((t.courseCode?.trim() || t.courseName?.trim()) && Number(t.conducted ?? 0) > Number(t.scheduled ?? 0)),
      }))
      .filter((x) => x.over),
  );
  const reviewNotes = $derived.by(() => {
    const notes: { level: 'error' | 'warn'; text: string; step: Step }[] = [];
    for (const o of teachOver) notes.push({ level: 'error', text: `Course ${o.i + 1}: conducted classes exceed scheduled — fix the numbers.`, step: 'teaching' });
    if (!hasValidTeaching) notes.push({ level: 'warn', text: 'No teaching entries yet.', step: 'teaching' });
    if (!researchActive && !researchNA) notes.push({ level: 'warn', text: 'No research records.', step: 'research' });
    if (!dutiesCount && !dutiesNA) notes.push({ level: 'warn', text: 'No institutional duties.', step: 'duties' });
    if (!outreachCount && !outreachNA) notes.push({ level: 'warn', text: 'No outreach activity.', step: 'outreach' });
    if (!attachments.length) notes.push({ level: 'warn', text: 'No supporting files attached.', step: 'files' });
    return notes;
  });

  onMount(async () => {
    const res = await fetch('/api/reports');
    const d = await res.json();
    let recurringProfile: any = null;
    try { recurringProfile = (await (await fetch('/api/me/profile')).json()).profile; } catch {}
    hasTemplate = Boolean(
      recurringProfile?.subjects?.length ||
      recurringProfile?.research?.length ||
      recurringProfile?.duties?.length ||
      recurringProfile?.outreach?.length,
    );
    reportId = d.report.id;
    reportStatus = d.report.status;
    history = d.reports ?? [];
    periodLabel = d.report?.period_label ?? d.policy?.period?.label ?? periodLabel;
    if (d.teaching?.length)
      teaching = d.teaching.map((t: any) => ({ courseCode: t.course_code, courseName: t.course_name, programLevel: t.program_level, classType: t.class_type, scheduled: t.scheduled, conducted: t.conducted, missed: t.missed, missedAction: t.missed_action ?? '', syllabusCompletion: t.syllabus_completion ?? 0, syllabusLecture: t.syllabus_lecture ?? 0 }));
    else if (recurringProfile?.subjects?.length)
      teaching = recurringProfile.subjects.map((t: any) => ({ courseCode: t.courseCode ?? '', courseName: t.courseName ?? '', programLevel: t.programLevel ?? '', classType: t.classType ?? 'Lecture', scheduled: Number(t.scheduled ?? 0), conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }));
    researchRecords = (d.research ?? []).map((r: any) => ({ category: r.category, title: r.title, venueOrAgency: r.venue_or_agency ?? '', indexingOrQuality: r.indexing_or_quality ?? '', role: r.role ?? '', status: r.status ?? '' }));
    if (!researchRecords.length && recurringProfile?.research?.length) researchRecords = recurringProfile.research.map((r: any) => ({ category: r.category ?? 'Journal Paper', title: r.title ?? '', venueOrAgency: r.venueOrAgency ?? '', indexingOrQuality: '', role: r.role ?? '', status: '' }));
    dutiesRecords = (d.duties ?? []).map((r: any) => ({ name: r.name, role: r.role, activity: r.activity ?? '', reach: r.reach ?? '', outcome: r.outcome ?? '' }));
    if (!dutiesRecords.length && recurringProfile?.duties?.length) dutiesRecords = recurringProfile.duties.map((r: any) => ({ name: r.name ?? '', role: r.role ?? '', activity: r.activity ?? '', reach: '', outcome: '' }));
    outreachRecords = (d.outreach ?? []).map((r: any) => ({ activity: r.activity, audience: r.audience ?? '', outcome: r.outcome ?? '', date: r.date ?? '' }));
    if (!outreachRecords.length && recurringProfile?.outreach?.length) outreachRecords = recurringProfile.outreach.map((r: any) => ({ activity: r.activity ?? '', audience: r.audience ?? '', outcome: '', date: '' }));
    canEdit = d.policy?.canEdit ?? true;
    deadlineDate = d.policy?.deadline ?? '';
    researchEmpty = Number(d.report?.research_empty ?? 0) === 1;
    dutiesEmpty = Number(d.report?.duties_empty ?? 0) === 1;
    outreachEmpty = Number(d.report?.outreach_empty ?? 0) === 1;
    if (reportId) {
      try { const r = await fetch(`/api/reports/${reportId}`); const rd = await r.json(); reviews = rd.reviews ?? []; }
      catch { show('Could not load review history.', 'err'); }
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
    try {
      const res = await fetch('/api/me/profile');
      const d = await res.json();
      const profile = d.profile ?? {};
      teaching = (profile.subjects ?? []).map((t: any) => ({ courseCode: t.courseCode ?? '', courseName: t.courseName ?? '', programLevel: t.programLevel ?? '', classType: t.classType ?? 'Lecture', scheduled: Number(t.scheduled ?? 0), conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }));
      researchRecords = (profile.research ?? []).map((r: any) => ({ category: r.category ?? 'Journal Paper', title: r.title ?? '', venueOrAgency: r.venueOrAgency ?? '', indexingOrQuality: '', role: r.role ?? '', status: '' }));
      dutiesRecords = (profile.duties ?? []).map((r: any) => ({ name: r.name ?? '', role: r.role ?? '', activity: r.activity ?? '', reach: '', outcome: '' }));
      outreachRecords = (profile.outreach ?? []).map((r: any) => ({ activity: r.activity ?? '', audience: r.audience ?? '', outcome: '', date: '' }));
      if (!teaching.length) teaching = [{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }];
      await saveDraft();
      await saveActivity('research');
      await saveActivity('duties');
      await saveActivity('outreach');
      show('Recurring template loaded.');
    } catch { show('Could not load the recurring template.', 'err'); }
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
      <NotificationBell />
      <span class="save-note">{savedAt}</span>
      {#if !isReadonly}
        <a class="act-link" href="/dashboard">← Dashboard</a>
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

  {#if confirmTemplate}
    <div class="overlay" role="presentation" onclick={() => (confirmTemplate = false)} onkeydown={(e) => { if (e.key === 'Escape') confirmTemplate = false; }}>
      <div class="confirm-dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h3>Load recurring template?</h3>
        <p>This will replace all currently filled report data across Teaching, Research, Duties, and Outreach. Any weekly changes you have entered will be removed.</p>
        <div class="confirm-actions">
          <button class="act-link" onclick={() => (confirmTemplate = false)}>Cancel</button>
          <button class="act-submit" onclick={loadRecurringTemplate}>Replace with template</button>
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
        <div class="section-top">
          <h2>Teaching & academic delivery</h2>
          <span class="metric-badge">{deliveryRate}% delivery</span>
        </div>
        <p class="section-hint">Course details and scheduled classes come from your recurring profile. Update the weekly delivery values below.</p>
        {#if !hasValidTeaching && !isReadonly}
          <div class="start-helper">
            <div>
              <strong>Starting from a blank week?</strong>
              <p>Pre-fill everything, then just update the numbers.</p>
            </div>
            <div class="start-acts">
              {#if hasTemplate}<button class="act-link" onclick={() => (confirmTemplate = true)}>Load my template</button>{/if}
              {#if prevReport}<button class="act-link" onclick={() => (confirmCopy = true)}>Copy from {prevReportLabel}</button>{/if}
            </div>
          </div>
        {/if}
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
                <label>Conducted this week<input type="number" min="0" bind:value={item.conducted} oninput={() => scheduleTeachingSave()} placeholder="0" /></label>
                <label>Missed this week<input type="number" min="0" bind:value={item.missed} oninput={() => scheduleTeachingSave()} placeholder="0" /></label>
                <label>Syllabus covered up to lecture no.<input type="number" min="0" bind:value={item.syllabusLecture} oninput={() => scheduleTeachingSave()} placeholder="e.g. 18" /></label>
              </div>
              <label class="missed-label">Weekly action for missed classes<input bind:value={item.missedAction} oninput={() => scheduleTeachingSave()} placeholder="e.g. Makeup class scheduled" /></label>
            </div>
          {/each}
          <button class="act-add" onclick={addTeaching}>+ Add course</button>
        </div>
      {:else if activeSection === 'research'}
        <div class="section-top"><h2>Research & publications</h2><button class="na-toggle" class:active={researchNA} onclick={() => setNotApplicable('research')}>{researchNA ? 'Undo' : 'Nothing this week'}</button></div>
        {#if researchNA}<p class="na-note">No research activity this week.</p>{/if}
        {#each researchRecords.filter(r => r.title !== 'N/A') as item, i}
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
          {#if !researchNA}<button class="act-add" onclick={() => (researchRecords = [...researchRecords, { category: 'Journal Paper', title: '', venueOrAgency: '', indexingOrQuality: '', role: '', status: '' }])}>+ Add record</button>{/if}
          <button class="act-link" onclick={() => saveActivity('research')}>{additionalSaving ? 'Saving…' : 'Save research'}</button>
        </div>
      {:else if activeSection === 'duties'}
        <div class="section-top"><h2>Institutional duties</h2><button class="na-toggle" class:active={dutiesNA} onclick={() => setNotApplicable('duties')}>{dutiesNA ? 'Undo' : 'Nothing this week'}</button></div>
        {#if dutiesNA}<p class="na-note">No institutional duties this week.</p>{/if}
        {#each dutiesRecords.filter(d => d.name !== 'N/A') as item, i}
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
          {#if !dutiesNA}<button class="act-add" onclick={() => (dutiesRecords = [...dutiesRecords, { name: '', role: '', activity: '', reach: '', outcome: '' }])}>+ Add duty</button>{/if}
          <button class="act-link" onclick={() => saveActivity('duties')}>{additionalSaving ? 'Saving…' : 'Save duties'}</button>
        </div>
      {:else if activeSection === 'outreach'}
        <div class="section-top"><h2>Outreach activity</h2><button class="na-toggle" class:active={outreachNA} onclick={() => setNotApplicable('outreach')}>{outreachNA ? 'Undo' : 'Nothing this week'}</button></div>
        {#if outreachNA}<p class="na-note">No outreach activity this week.</p>{/if}
        {#each outreachRecords.filter(r => r.activity !== 'N/A') as item, i}
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
          {#if !outreachNA}<button class="act-add" onclick={() => (outreachRecords = [...outreachRecords, { activity: '', audience: '', outcome: '', date: '' }])}>+ Add outreach</button>{/if}
          <button class="act-link" onclick={() => saveActivity('outreach')}>{additionalSaving ? 'Saving…' : 'Save outreach'}</button>
        </div>
      {:else if activeSection === 'files'}
        <div class="section-top"><h2>Supporting files</h2></div>
        <p class="section-hint">Attach timetables, event photos, certificates, or any evidence for this week.</p>
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
      {:else if activeSection === 'review'}
        <div class="section-top"><h2>Review & submit</h2></div>
        <p class="section-hint">Check everything below, then submit. A submitted report locks until your HOD reopens it.</p>
        {#if !isReadonly}
          <div class="speed-row">
            {#if prevReport}<button class="act-link" onclick={() => (confirmCopy = true)} title={`Fill this report from ${prevReportLabel}`}>Copy from {prevReportLabel}</button>{/if}
            <button class="act-link" onclick={() => (confirmTemplate = true)} title="Replace this report with your recurring template">Load recurring template</button>
            <a class="act-link" href="/api/reports/{reportId}/pdf" target="_blank">PDF</a>
            <a class="act-link" href="/api/reports/current/export">CSV</a>
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
          <button class="act-link" onclick={prevStep}>← Back</button>
        {:else}
          <span></span>
        {/if}
        {#if activeSection !== 'review'}
          <button class="act-submit" onclick={nextStep}>Continue →</button>
        {:else}
          <button class="act-link" onclick={() => goStep('files')}>← Review files</button>
        {/if}
      </div>
    {/if}
  </div>
</main>

<style>
  .shell { max-width: 1200px; }
  .editor-head { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 14px; position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, var(--paper) 88%, white); backdrop-filter: blur(10px); padding: 14px 18px; margin-inline: -18px; border-bottom: 1px solid var(--line); }
  .editor-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .editor-head-left h1 { font-size: 1.5rem; letter-spacing: -0.03em; margin: 0; font-weight: 750; color: var(--text-1); }
  .head-period { font-size: 0.84rem; color: var(--text-3); white-space: nowrap; }
  .status-pill { font-size: 0.7rem; font-weight: 800; padding: 4px 11px; border-radius: 999px; letter-spacing: 0.02em; border: 1px solid transparent; white-space: nowrap; }
  .status-pill.draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .status-pill.submitted { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .status-pill.approved { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .status-pill.changes { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .editor-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .save-note { font-size: 0.74rem; color: var(--muted-2); white-space: nowrap; min-width: 86px; text-align: right; font-weight: 600; }
  .act-link { border: 1px solid var(--line); border-radius: 7px; padding: 8px 13px; background: var(--panel); color: var(--accent-strong); font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; box-shadow: var(--shadow-xs); transition: all 0.12s; }
  .act-link:hover { background: var(--bg-hover); border-color: var(--blue-border); box-shadow: var(--shadow-sm); }
  .act-submit { border: 1px solid var(--navy); border-radius: 7px; padding: 9px 17px; background: var(--navy); color: var(--paper); font: inherit; font-size: 0.78rem; font-weight: 750; cursor: pointer; white-space: nowrap; box-shadow: var(--shadow-sm); transition: all 0.12s; }
  .act-submit:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .act-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .act-remove { border: 1px solid var(--red-border); border-radius: 5px; padding: 5px 9px; background: var(--panel); color: var(--red); font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
  .act-remove:hover { background: var(--red-bg-alt); }
  .act-add { border: 1px solid var(--line); border-radius: 6px; padding: 9px 14px; background: var(--bg-hover); color: var(--blue); font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.12s; }
  .act-add:hover { background: var(--bg-hover); }
  .progress-track { height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; margin-bottom: 26px; box-shadow: inset 0 1px 2px rgba(15,23,42,0.06); }
  .progress-track i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--blue-dark)); border-radius: 999px; transition: width 0.3s ease; }
  .success-banner, .state-banner { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-radius: var(--radius-md); font-size: 0.84rem; margin-bottom: 16px; flex-wrap: wrap; box-shadow: var(--shadow-xs); border: 1px solid; }
  .success-banner { background: #f2f9f4; border-color: var(--success-border); color: var(--green); }
  .state-banner.locked { background: #fdf8e7; border-color: var(--draft-border); color: var(--warn-dark); }
  .state-banner.changes { background: var(--red-bg-alt); border-color: var(--red-border); color: var(--red-dark); }
  .success-banner a, .state-banner a { color: var(--blue); text-decoration: none; font-weight: 700; }
  .overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); display: grid; place-items: center; z-index: 100; }
  .confirm-dialog { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 28px; max-width: 400px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
  .confirm-dialog h3 { margin: 0 0 8px; font-size: 1.1rem; color: var(--ink-2); }
  .confirm-dialog p { margin: 0 0 20px; color: var(--muted-3); font-size: 0.84rem; line-height: 1.5; }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }
  .review-box { margin-bottom: 20px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px; }
  .review-box summary { cursor: pointer; font-size: 0.78rem; font-weight: 700; color: var(--muted); }
  .review-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line-2); font-size: 0.8rem; }
  .review-row:last-child { border-bottom: 0; }
  .review-pill { flex: none; padding: 3px 7px; border-radius: 4px; font-size: 0.62rem; font-weight: 800; align-self: start; }
  .rv-ok { background: var(--green-soft); color: var(--green); }
  .rv-chg { background: var(--red-soft); color: var(--red-dark); }
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
  .review-paper { margin-top: 20px; }
  .review-submit { display: grid; gap: 8px; justify-items: center; margin-top: 24px; padding: 24px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
  .act-submit.big { font-size: 0.9rem; padding: 13px 34px; border-radius: 9px; }
  .submit-note { margin: 0; font-size: 0.78rem; color: var(--red-dark); }
  .section-top { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-top h2 { font-size: 1.18rem; margin: 0; letter-spacing: -0.02em; font-weight: 750; color: var(--text-1); }
  .section-hint { margin: -10px 0 18px; color: var(--muted-2); font-size: 0.82rem; line-height: 1.5; }
  .start-helper { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px 18px; margin-bottom: 18px; border-radius: var(--radius-md); border: 1px dashed var(--blue-border); background: #f4f8fd; }
  .start-helper strong { display: block; font-size: 0.84rem; color: var(--text-1); margin-bottom: 3px; }
  .start-helper p { margin: 0; font-size: 0.78rem; color: var(--text-3); }
  .start-acts { display: flex; gap: 8px; flex-wrap: wrap; }
  .metric-badge { font-size: 0.7rem; font-weight: 800; padding: 5px 10px; border-radius: 999px; background: var(--success-bg); border: 1px solid var(--success-border); color: var(--green); }
  .course-list { display: grid; gap: 16px; }
  .course-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 22px; box-shadow: var(--shadow-sm); }
  .course-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line-2); }
  .course-head strong { font-size: 0.84rem; color: var(--blue-dark); font-weight: 800; letter-spacing: 0.01em; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .number-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
  .course-card label, .record-card label { display: block; color: var(--text-3); font-size: 0.74rem; font-weight: 700; letter-spacing: 0.005em; }
  .course-card input, .course-card select, .record-card input, .record-card select, .summary-area { display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1); font: inherit; font-size: 0.86rem; box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .course-card input:focus, .course-card select:focus, .record-card input:focus, .record-card select:focus, .summary-area:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .course-card input::placeholder, .record-card input::placeholder { color: var(--muted-3); }
  .missed-label { display: block; color: var(--muted); font-size: 0.72rem; font-weight: 700; }
  .summary-area { border-radius: 6px; min-height: 160px; resize: vertical; }
  .attach-list { display: grid; gap: 6px; margin-bottom: 14px; }
  .attach-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 6px; }
  .attach-info { flex: 1; min-width: 0; }
  .attach-info strong { display: block; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .attach-info small { color: var(--muted-2); font-size: 0.66rem; }
  .attach-acts { display: flex; gap: 8px; flex: none; }
  .attach-acts a { color: var(--blue); text-decoration: none; font-size: 0.72rem; font-weight: 700; }
  .upload-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border: 1px dashed var(--blue-border); border-radius: 6px; color: var(--muted); font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: background 0.1s; }
  .upload-btn:hover { background: var(--bg-hover); }
  .upload-btn input { display: none; }
  .record-card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 20px; margin-bottom: 12px; box-shadow: var(--shadow-sm); }
  .record-card .field-grid { margin-bottom: 0; }
  .record-acts { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 16px; }
  .empty { color: var(--muted-2); font-size: 0.84rem; padding: 10px 0; }
  .empty-hint { color: var(--muted-2); font-size: 0.84rem; background: var(--panel); border: 1px dashed var(--blue-border); border-radius: var(--radius-md); padding: 18px 20px; margin: 0 0 14px; box-shadow: var(--shadow-xs); }
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
  .na-toggle { margin-left: auto; border: 1px solid var(--line); border-radius: 5px; padding: 7px 10px; background: var(--panel); color: var(--muted); font: inherit; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
  .na-toggle:hover, .na-toggle.active { border-color: var(--blue-border); background: var(--bg-hover); color: var(--blue); }
  .na-note { margin: -8px 0 16px; padding: 13px 15px; border: 1px dashed var(--line); border-radius: 7px; background: var(--paper); color: var(--muted); font-size: 0.78rem; }
  @media (max-width: 900px) {
    .steps { padding: 10px 12px; }
    .step-label { display: none; }
    .step.current .step-label { display: inline; }
  }
  @media (max-width: 700px) {
    .editor-head { flex-direction: column; align-items: start; }
    .editor-actions { flex-wrap: wrap; }
    .field-grid { grid-template-columns: 1fr; }
    .number-grid { grid-template-columns: repeat(2, 1fr); }
    .summary-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 500px) {
    .number-grid { grid-template-columns: 1fr; }
    .preview-row { display: block; padding: 8px 0; }
    .summary-grid { grid-template-columns: 1fr; }
  }
</style>
