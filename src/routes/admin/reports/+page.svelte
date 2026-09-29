<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  import AsyncState from '$lib/components/AsyncState.svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import ReportPreview from '$lib/components/ReportPreview.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { queueQuery, missingQuery, QUEUE_STATUSES } from '$lib/queue-filter';
  type ReviewRow = { id: string; status: string; updated_at: string; completion: number; faculty_name: string; period_label: string };
  type TeachingRow = { course_code: string; course_name: string; program_level: string; class_type: string; scheduled: number; conducted: number; missed: number; missed_action: string; syllabus_completion: number };
  type ResearchRow = { category: string; title: string; venue_or_agency: string; status: string };
  type DutyRow = { name: string; role: string; activity: string };
  type OutreachRow = { activity: string; audience: string; date: string };
  type AttachRow = { id: string; filename: string; size: number };
  type ReviewHistoryRow = { decision: string; remarks: string; created_at: string; reviewer_name: string };
  let { data } = $props();
  // The list derives from the load, so it is in the server-rendered HTML. Seeding
  // it in $effect.pre left the queue empty until the page hydrated, which read as
  // "no reports match these filters" even when rows existed.
  // A decision is recorded per report so the row updates without refetching.
  const decided = $state<Record<string, string>>({});
  const reports = $derived(data.reports.map((r) => (decided[r.id] ? { ...r, status: decided[r.id] } : r)));
  let selected = $state<ReviewRow | null>(null);
  $effect(() => {
    if (!selected && reports.length) selected = reports[0];
  });
  const filters = $derived(data.filters);
  // The download carries the filters currently on screen, so the CSV and the
  // table can never show different sets of reports.
  const downloadHref = $derived(`/api/reviews?format=csv&${queueQuery(filters)}`.replace(/\?format=csv&$/, '?format=csv'));
  const notSubmittedHref = $derived(
    `/api/reports/missing?${missingQuery(filters.period)}&format=csv`.replace('?&', '?'),
  );
  let missing = $state<{ name: string; email: string; role: string }[]>([]);
  let missingLabel = $state('');
  let missingLoading = $state(false);
  async function loadMissing() {
    missingLoading = true;
    try {
      const res = await fetch(`/api/reports/missing?${missingQuery(filters.period)}`);
      const d = await res.json().catch(() => ({}));
      missing = d.missing ?? [];
      missingLabel = d.periodLabel ?? '';
    } catch {
      missing = [];
    } finally {
      missingLoading = false;
    }
  }
  let comment = $state('');
  let error = $state('');
  let reason = $state('');
  let allowedUntil = $state('');
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
  // The queue arrives filtered with the page; the selected report's content
  // stays client-side.
  onMount(() => {
    if (selected) loadContent(selected.id);
    loadMissing();
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
      decided[selected.id] = next;
      selected = { ...selected, status: next };
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
</script>

<svelte:head><title>Review queue · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <PageHeader title="Review queue" sub="{reports.length} report{reports.length === 1 ? '' : 's'}">
    {#snippet actions()}
      <NotificationBell />
      <a class="btn" href={downloadHref} target="_blank" rel="noopener">Download CSV</a>
      {#if selected}<a class="btn" href="/api/reports/{selected.id}/pdf" target="_blank">PDF</a>{/if}
    {/snippet}
  </PageHeader>
  {#if error}<AsyncState kind="banner" message={error} />{/if}
    <div class="review-layout">
      <section class="queue-panel">
        <div class="queue-head">Reports requiring attention</div>
        <form class="filter-bar" method="GET" action="/admin/reports">
          <input class="filter-search" type="search" name="q" placeholder="Search name or email…" aria-label="Filter reports by name or email" value={filters.q} />
          <select class="filter-select" name="status" aria-label="Filter by status" value={filters.status}>
            <option value="">All statuses</option>
            {#each QUEUE_STATUSES as s}
              <option value={s}>{s === 'CHANGES_REQUIRED' ? 'Changes requested' : s.charAt(0) + s.slice(1).toLowerCase()}</option>
            {/each}
          </select>
          <select class="filter-select" name="period" aria-label="Filter by week" value={filters.period}>
            <option value="">All weeks</option>
            {#each data.periods as p}
              <option value={p.id}>{p.label}{p.isOpen ? ' (open)' : ''}</option>
            {/each}
          </select>
          <button class="btn" type="submit">Apply</button>
          {#if filters.q || filters.status || filters.period}
            <a class="btn-link" href="/admin/reports">Reset</a>
          {/if}
        </form>
        {#if !reports.length}
          <div class="q-empty">No reports match these filters.</div>
        {:else}
          {#each reports as r}
            <button class="q-row" class:chosen={selected?.id === r.id} onclick={() => selectReport(r)}>
              <div class="q-info">
                <strong>{r.faculty_name}</strong>
                <small>{r.period_label} — Updated {new Date(r.updated_at).toLocaleDateString()}</small>
              </div>
              <StatusPill status={r.status} />
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
            <StatusPill status={selected.status} />
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
                      <StatusPill status={rv.decision} />
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
                  <button class="btn" onclick={reopen}>Reopen</button>
                </div>
              </details>
            </div>
          {:else}
            <div class="rp-body">
              {#if contentLoading}
                <AsyncState kind="loading" message="" />
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
                        <a class="btn" href="/api/attachments/{a.id}" download>Download</a>
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

    <!-- Who has not filed. Kept apart from the queue, because chasing a missing
         report is a different job from deciding on one that arrived. -->
    <section class="missing-panel">
      <div class="panel-head">
        <h2>Not submitted{missingLabel ? ` — ${missingLabel}` : ''}</h2>
        <a class="btn" href={notSubmittedHref} target="_blank" rel="noopener">Download CSV</a>
      </div>
      {#if missingLoading}
        <div class="missing-empty">Checking…</div>
      {:else if !missing.length}
        <div class="missing-empty">Everyone who teaches has filed for this week.</div>
      {:else}
        {#each missing as m}
          <div class="missing-row">
            <div>
              <strong>{m.name}</strong>
              <span>{m.email} · {m.role === 'HOD' ? 'Department head' : 'Faculty'}</span>
            </div>
          </div>
        {/each}
      {/if}
    </section>
</main>

<style>
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
  .rp-reopen-body .btn { align-self: start; }
  .attach-list { display: grid; gap: 8px; margin-top: 4px; }
  .attach-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 7px; }
  .attach-name { flex: 1; min-width: 0; font-size: 0.78rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty-state { color: var(--muted-2); font-size: 0.78rem; padding: 10px 0; }
  @media (max-width: 800px) { .review-layout { grid-template-columns: 1fr; } }
  @media (max-width: 520px) { .rp-btns { flex-direction: column; } }
  .filter-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--line-2); background: var(--paper); }
  .filter-search, .filter-select { padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1); font: inherit; font-size: 0.8rem; }
  .filter-search { flex: 1; min-width: 160px; }
  .filter-search:focus, .filter-select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .btn-link { font-size: 0.78rem; color: var(--blue); text-decoration: none; font-weight: 700; }
  .btn-link:hover { text-decoration: underline; }
  .missing-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
  .missing-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--line-2); }
  .missing-row:last-child { border-bottom: 0; }
  .missing-row strong { display: block; font-size: 0.84rem; color: var(--text-1); }
  .missing-row span { font-size: 0.76rem; color: var(--text-3); }
  .missing-empty { padding: 20px; text-align: center; color: var(--muted-2); font-size: 0.8rem; }
</style>