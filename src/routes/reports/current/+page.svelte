<script lang="ts">
  import type { TeachingRecord } from '$lib/domain';
  import { onDestroy, onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
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
  let teaching: TeachingRecord[] = $state([{ courseCode: '', courseName: '', programLevel: '', classType: 'Lecture', scheduled: 0, conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }]);
  let weeklySummary = $state('');
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
  let additionalSaving = $state(false);
  let saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let activeExtraSection = $state('attachments');
  let deadlineDate = $state('');
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
  let researchNA = $derived(researchRecords.some(r => r.title === 'N/A'));
  let dutiesNA = $derived(dutiesRecords.some(d => d.name === 'N/A'));
  let outreachNA = $derived(outreachRecords.some(r => r.activity === 'N/A'));
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

  onMount(async () => {
    const res = await fetch('/api/reports');
    const d = await res.json();
    let recurringProfile: any = null;
    try { recurringProfile = (await (await fetch('/api/me/profile')).json()).profile; } catch {}
    reportId = d.report.id;
    reportStatus = d.report.status;
    history = d.reports ?? [];
    periodLabel = d.report?.period_label ?? d.policy?.period?.label ?? periodLabel;
    if (d.teaching?.length)
      teaching = d.teaching.map((t: any) => ({ courseCode: t.course_code, courseName: t.course_name, programLevel: t.program_level, classType: t.class_type, scheduled: t.scheduled, conducted: t.conducted, missed: t.missed, missedAction: t.missed_action ?? '', syllabusCompletion: t.syllabus_completion ?? 0, syllabusLecture: t.syllabus_lecture ?? 0 }));
    else if (recurringProfile?.subjects?.length)
      teaching = recurringProfile.subjects.map((t: any) => ({ courseCode: t.courseCode ?? '', courseName: t.courseName ?? '', programLevel: t.programLevel ?? '', classType: t.classType ?? 'Lecture', scheduled: Number(t.scheduled ?? 0), conducted: 0, missed: 0, missedAction: '', syllabusCompletion: 0, syllabusLecture: 0 }));
    weeklySummary = d.report.summary ?? '';
    researchRecords = (d.research ?? []).map((r: any) => ({ category: r.category, title: r.title, venueOrAgency: r.venue_or_agency ?? '', indexingOrQuality: r.indexing_or_quality ?? '', role: r.role ?? '', status: r.status ?? '' }));
    if (!researchRecords.length && recurringProfile?.research?.length) researchRecords = recurringProfile.research.map((r: any) => ({ category: r.category ?? 'Journal Paper', title: r.title ?? '', venueOrAgency: r.venueOrAgency ?? '', indexingOrQuality: '', role: r.role ?? '', status: '' }));
    dutiesRecords = (d.duties ?? []).map((r: any) => ({ name: r.name, role: r.role, activity: r.activity ?? '', reach: r.reach ?? '', outcome: r.outcome ?? '' }));
    if (!dutiesRecords.length && recurringProfile?.duties?.length) dutiesRecords = recurringProfile.duties.map((r: any) => ({ name: r.name ?? '', role: r.role ?? '', activity: r.activity ?? '', reach: '', outcome: '' }));
    outreachRecords = (d.outreach ?? []).map((r: any) => ({ activity: r.activity, audience: r.audience ?? '', outcome: r.outcome ?? '', date: r.date ?? '' }));
    if (!outreachRecords.length && recurringProfile?.outreach?.length) outreachRecords = recurringProfile.outreach.map((r: any) => ({ activity: r.activity ?? '', audience: r.audience ?? '', outcome: '', date: '' }));
    canEdit = d.policy?.canEdit ?? true;
    deadlineDate = d.policy?.deadline ?? '';
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
  async function saveActivity(kind: 'research' | 'duties' | 'outreach') {
    if (!reportId || !canEdit || additionalSaving) return;
    additionalSaving = true; clearTimeout(saveTimer); savedAt = 'Saving...';
    await fetch(`/api/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId, records: kind === 'research' ? researchRecords : kind === 'duties' ? dutiesRecords : outreachRecords }) });
    additionalSaving = false; flashSaved();
  }
  function setNotApplicable(kind: 'research' | 'duties' | 'outreach') {
    if (kind === 'research') researchRecords = researchNA ? [] : [{ category: 'Journal Paper', title: 'N/A', venueOrAgency: '', indexingOrQuality: '', role: '', status: '' }];
    if (kind === 'duties') dutiesRecords = dutiesNA ? [] : [{ name: 'N/A', role: '', activity: '', reach: '', outcome: '' }];
    if (kind === 'outreach') outreachRecords = outreachNA ? [] : [{ activity: 'N/A', audience: '', outcome: '', date: '' }];
    saveActivity(kind);
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
      {#if !isReadonly && prevReport}
        <button class="act-link" onclick={() => (confirmCopy = true)} title={`Fill this report from ${prevReportLabel}`}>Copy from last week</button>
      {/if}
      {#if !isReadonly}
        <button class="act-link" onclick={() => (confirmTemplate = true)} title="Replace this report with your recurring template">Load recurring template</button>
      {/if}
      <a class="act-link" href="/api/reports/{reportId}/pdf" target="_blank">PDF</a>
      <a class="act-link" href="/api/reports/current/export">CSV</a>
      {#if !isReadonly}
        <button class="act-link" onclick={() => (preview = !preview)}>{preview ? 'Edit' : 'Preview'}</button>
        <button class="act-submit" disabled={!canEdit || saving || !canSubmit} title={!canSubmit ? `Closes ${new Date(deadlineDate).toLocaleString()}` : ''} onclick={() => (confirmSubmit = true)}>Submit →</button>
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
      <button class:active={activeSection === 'additional'} onclick={() => (activeSection = 'additional')}>
        <span class="sn-num">04</span> Evidence & records <span class="sn-count">{attachments.length}</span>
      </button>
      <button class:active={activeSection === 'summary'} onclick={() => (activeSection = 'summary')}>
        <span class="sn-num">05</span> Weekly summary <span class="sn-count">{weeklySummary ? '1' : '0'}</span>
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
              <span class="preview-stat">{item.conducted} / {item.scheduled} classes · up to lecture {item.syllabusLecture || '—'}</span>
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
        <p class="section-hint">Course details and scheduled classes come from your recurring profile. Update the weekly delivery values below.</p>
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
        <div class="section-top"><h2>Research & publications</h2><button class="na-toggle" class:active={researchNA} onclick={() => setNotApplicable('research')}>{researchNA ? 'Undo N/A' : 'Mark N/A this week'}</button></div>
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
        <div class="section-top"><h2>Institutional duties</h2><button class="na-toggle" class:active={dutiesNA} onclick={() => setNotApplicable('duties')}>{dutiesNA ? 'Undo N/A' : 'Mark N/A this week'}</button></div>
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
      {:else if activeSection === 'summary'}
        <div class="section-top">
          <h2>Weekly Executive Summary & Dashboard</h2>
        </div>
        <div class="auto-summary">{autoSummary}</div>
        <div class="summary-grid">
          <div class="summary-metric primary"><span>Teaching delivery</span><strong>{conducted}<small> / {scheduled} classes</small></strong><em>{deliveryRate}% delivery</em></div>
          <div class="summary-metric"><span>Research</span><strong>{researchNA ? 'N/A' : researchActive}</strong><em>{researchNA ? 'no activity recorded' : researchActive === 1 ? 'item this week' : 'items this week'}</em></div>
          <div class="summary-metric"><span>Institutional duties</span><strong>{dutiesNA ? 'N/A' : dutiesCount}</strong><em>{dutiesNA ? 'no activity recorded' : dutiesCount === 1 ? 'item this week' : 'items this week'}</em></div>
          <div class="summary-metric"><span>Outreach</span><strong>{outreachNA ? 'N/A' : outreachCount}</strong><em>{outreachNA ? 'no activity recorded' : outreachCount === 1 ? 'item this week' : 'items this week'}</em></div>
          <div class="summary-metric"><span>Supporting files</span><strong>{attachments.length}</strong><em>{attachments.length === 1 ? 'file attached' : 'files attached'}</em></div>
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
          <div class="section-top"><h2>Outreach activity</h2><button class="na-toggle" class:active={outreachNA} onclick={() => setNotApplicable('outreach')}>{outreachNA ? 'Undo N/A' : 'Mark N/A this week'}</button></div>
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
  .head-period { font-size: 0.82rem; color: var(--muted); }
  .status-pill { font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 5px; letter-spacing: 0.02em; }
  .status-pill.draft { background: var(--warn-soft); color: var(--warn-dark); }
  .status-pill.submitted { background: var(--blue-soft); color: var(--blue-dark); }
  .status-pill.approved { background: var(--green-soft); color: var(--green); }
  .status-pill.changes { background: var(--red-soft); color: var(--red-dark); }
  .editor-actions { display: flex; align-items: center; gap: 8px; }
  .save-note { font-size: 0.72rem; color: var(--muted-2); white-space: nowrap; }
  .act-link { border: 1px solid var(--line); border-radius: 6px; padding: 7px 12px; background: var(--panel); color: var(--blue); font: inherit; font-size: 0.73rem; font-weight: 700; cursor: pointer; text-decoration: none; white-space: nowrap; transition: all 0.12s; }
  .act-link:hover { background: var(--bg-hover); border-color: var(--blue-border); }
  .act-submit { border: 1px solid var(--navy); border-radius: 6px; padding: 7px 14px; background: var(--navy); color: var(--paper); font: inherit; font-size: 0.73rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.12s; }
  .act-submit:hover { background: var(--blue-hover); }
  .act-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .act-remove { border: 1px solid var(--red-border); border-radius: 5px; padding: 5px 9px; background: var(--panel); color: var(--red); font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; }
  .act-remove:hover { background: var(--red-bg-alt); }
  .act-add { border: 1px solid var(--line); border-radius: 6px; padding: 9px 14px; background: var(--bg-hover); color: var(--blue); font: inherit; font-size: 0.76rem; font-weight: 700; cursor: pointer; transition: all 0.12s; }
  .act-add:hover { background: var(--bg-hover); }
  .progress-track { height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; margin-bottom: 24px; }
  .progress-track i { display: block; height: 100%; background: var(--blue); border-radius: 2px; transition: width 0.3s ease; }
  .success-banner, .state-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 7px; font-size: 0.82rem; margin-bottom: 16px; flex-wrap: wrap; }
  .success-banner { background: rgba(127, 191, 151, 0.1); border: 1px solid rgba(127, 191, 151, 0.4); color: var(--green); }
  .state-banner.locked { background: rgba(240, 212, 138, 0.1); border: 1px solid rgba(240, 212, 138, 0.4); color: var(--warn-dark); }
  .state-banner.changes { background: rgba(224, 144, 128, 0.1); border: 1px solid rgba(224, 144, 128, 0.4); color: var(--red-dark); }
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
  .editor-layout { display: grid; grid-template-columns: 200px 1fr; align-items: start; gap: 28px; }
  .section-nav { position: sticky; top: 20px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
  .section-nav button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 10px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); cursor: pointer; text-align: left; font: inherit; font-size: 0.78rem; transition: all 0.1s; }
  .section-nav button:hover, .section-nav button.active { background: var(--bg-hover); color: var(--blue); }
  .section-nav button.active { font-weight: 700; }
  .sn-num { font-size: 0.6rem; font-weight: 800; color: var(--muted-3); }
  .active .sn-num { color: var(--blue); }
  .sn-count { margin-left: auto; font-size: 0.6rem; font-weight: 800; color: var(--muted-3); background: var(--bg-hover); padding: 1px 5px; border-radius: 4px; }
  .form-area { min-height: 300px; }
  .section-top { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-top h2 { font-size: 1.1rem; margin: 0; letter-spacing: -0.02em; }
  .section-hint { margin: -10px 0 18px; color: var(--muted-2); font-size: 0.78rem; line-height: 1.45; }
  .metric-badge { font-size: 0.68rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; background: var(--green-soft); color: var(--green); }
  .course-list { display: grid; gap: 14px; }
  .course-card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
  .course-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .course-head strong { font-size: 0.82rem; color: var(--blue); }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .number-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
  .course-card label, .record-card label { display: block; color: var(--muted); font-size: 0.72rem; font-weight: 700; }
  .course-card input, .course-card select, .record-card input, .record-card select, .summary-area { display: block; width: 100%; box-sizing: border-box; margin-top: 5px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 5px; background: var(--bg-input); color: var(--ink-2); font: inherit; font-size: 0.82rem; }
  .course-card input:focus, .course-card select:focus, .record-card input:focus, .record-card select:focus, .summary-area:focus { outline: 2px solid rgba(59, 130, 246, 0.15); border-color: var(--blue-icon); }
  .missed-label { display: block; color: var(--muted); font-size: 0.72rem; font-weight: 700; }
  .summary-area { border-radius: 6px; min-height: 160px; resize: vertical; }
  .sub-tabs { display: flex; gap: 2px; background: var(--bg-hover); border-radius: 6px; padding: 3px; margin-bottom: 20px; }
  .sub-tabs button { flex: 1; border: 0; background: transparent; padding: 8px 10px; border-radius: 4px; font: inherit; font-size: 0.74rem; color: var(--muted); cursor: pointer; transition: all 0.1s; }
  .sub-tabs button.active { background: var(--panel); color: var(--ink-2); font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
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
  .record-card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 16px; margin-bottom: 10px; }
  .record-card .field-grid { margin-bottom: 0; }
  .record-acts { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 14px; }
  .empty { color: var(--muted-2); font-size: 0.8rem; padding: 10px 0; }
  .empty-hint { color: var(--muted-2); font-size: 0.8rem; background: var(--paper); border: 1px dashed var(--line); border-radius: 8px; padding: 16px 18px; margin: 0 0 14px; }
  .preview-paper { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 28px; }
  .preview-kicker { font-size: 0.7rem; font-weight: 800; color: var(--blue); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
  .preview-paper h2 { font-size: 1rem; margin: 16px 0 8px; }
  .preview-row { display: grid; grid-template-columns: 140px 1fr auto; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--line-2); font-size: 0.8rem; align-items: center; }
  .preview-row strong { color: var(--blue); }
  .preview-stat { color: var(--muted); }
  .preview-text { background: var(--paper); border-radius: 6px; padding: 14px; font-size: 0.82rem; line-height: 1.5; color: var(--ink-2); white-space: pre-wrap; }
  .preview-bar { display: flex; align-items: center; gap: 14px; padding: 10px 14px; background: var(--bg-hover); border: 1px solid var(--line); border-radius: 6px; margin-bottom: 16px; }
  .preview-bar strong { font-size: 0.8rem; color: var(--muted); }
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
    .summary-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 500px) {
    .number-grid { grid-template-columns: 1fr; }
    .preview-row { display: block; padding: 8px 0; }
    .summary-grid { grid-template-columns: 1fr; }
  }
</style>
