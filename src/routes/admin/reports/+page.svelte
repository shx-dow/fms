<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
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
  const filters = $derived(data.filters);
  // A decision is recorded per report so the row updates without refetching.
  const pending = $derived(reports.filter((r) => !decided[r.id] && r.status === 'SUBMITTED'));
  const position = $derived(selected ? reports.findIndex((r) => r.id === selected!.id) + 1 : 0);
  const total = $derived(reports.length);
  const doneCount = $derived(Object.keys(decided).length);
  const allDone = $derived(total > 0 && doneCount >= total);
  let remarksBox: HTMLTextAreaElement | undefined = $state();
  $effect(() => {
    if (!selected && reports.length) selected = reports[0];
  });
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
  // A single pass means never re-hunting the next item: after a decision the
  // queue moves on by itself, and the previous row stays visible as a stamp.
  function step(from: number, dir: 1 | -1) {
    if (!reports.length) return;
    const next = (from + dir + reports.length) % reports.length;
    selectReport(reports[next]);
  }
  function selectNextUndecided() {
    const start = selected ? reports.findIndex((r) => r.id === selected!.id) : -1;
    for (let i = 1; i <= reports.length; i++) {
      const idx = (start + i + reports.length) % reports.length;
      const cand = reports[idx];
      if (!decided[cand.id] && cand.status === 'SUBMITTED') {
        selectReport(cand);
        return;
      }
    }
    // Nothing left to clear. Land on something already decided so the reviewer
    // can still see what they just filed.
    if (start >= 0 && start < reports.length) selectReport(reports[start]);
  }
  async function review(next: 'APPROVED' | 'CHANGES_REQUIRED') {
    if (!selected || reviewBusy) return;
    error = '';
    if (next === 'CHANGES_REQUIRED' && !comment.trim()) {
      error = 'Add remarks explaining what needs to change.';
      remarksBox?.focus();
      return;
    }
    reviewBusy = next;
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId: selected.id, decision: next, remarks: comment }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { error = d.error ?? 'Unable to save review.'; return; }
      show(next === 'APPROVED' ? 'Approved.' : 'Changes requested.');
      decided[selected.id] = next;
      selected = { ...selected, status: next };
      selectNextUndecided();
    } finally { reviewBusy = null; }
  }
  async function reopen() {
    if (!selected) return; error = '';
    const res = await fetch('/api/exceptions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reportId: selected.id, reason, allowedUntil }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { error = d.error ?? 'Unable to reopen report.'; return; }
    show('Report reopened for editing.');
  }
  function selectReport(r: ReviewRow) { selected = r; comment = ''; error = ''; loadContent(r.id); }
  // Filters apply the moment they change; an Apply button made the reviewer stop
  // and remember, which is the opposite of a single pass.
  function applyFilters(e: Event) {
    // SAFETY: the handler is bound to the filter <form>, so the target is the form.
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (String(v).trim()) params.set(k, String(v));
    const qs = params.toString();
    goto(qs ? `/admin/reports?${qs}` : '/admin/reports', { keepFocus: true, noScroll: true });
  }
  function isTyping(t: EventTarget | null) {
    // SAFETY: a keydown target is an EventTarget, so it is either an Element we can query or null.
    const el = t as HTMLElement | null;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
  }
  function onKeydown(e: KeyboardEvent) {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'a' || e.key === 'A') { e.preventDefault(); review('APPROVED'); }
    else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); remarksBox?.focus(); }
    else if (e.key === 'ArrowRight' || e.key === 'j') { e.preventDefault(); step(position - 1, 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); step(position - 1, -1); }
  }
</script>

<svelte:head><title>Review queue · Faculty Reporting System</title></svelte:head>
<svelte:window onkeydown={onKeydown} />
<main class="shell">
  <PageHeader title="Review queue" sub="{total} report{total === 1 ? '' : 's'}{pending.length ? ` · ${pending.length} still to review` : total ? ' · all reviewed' : ''}">
    {#snippet actions()}
      <NotificationBell />
      <a class="btn" href={downloadHref} target="_blank" rel="noopener">Download CSV</a>
      {#if selected}<a class="btn" href="/api/reports/{selected.id}/pdf" target="_blank">PDF</a>{/if}
    {/snippet}
  </PageHeader>

  <!-- Progress across the pass, so the reviewer always knows how much is left. -->
  {#if total}
    <div class="pass-bar" class:pass-done={allDone}>
      <div class="pass-track"><i style:width="{total ? (doneCount / total) * 100 : 0}%"></i></div>
      <span class="pass-text">
        {#if allDone}
          All {total} reviewed
        {:else}
          {doneCount} of {total} reviewed · on {selected?.faculty_name ?? '—'}
        {/if}
      </span>
    </div>
  {/if}

  {#if error}<AsyncState kind="banner" message={error} />{/if}
    <div class="review-layout">
      <section class="queue-panel">
        <div class="queue-head">Queue</div>
        <form class="filter-bar" method="GET" action="/admin/reports" onchange={applyFilters}>
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
          {#if filters.q || filters.status || filters.period}
            <a class="btn-link" href="/admin/reports">Reset</a>
          {/if}
        </form>
        {#if !reports.length}
          <div class="q-empty">No reports match these filters.</div>
        {:else}
          {#each reports as r, i}
            <button class="q-row" class:chosen={selected?.id === r.id} onclick={() => selectReport(r)}>
              <span class="q-pos">{i + 1}</span>
              <span class="q-info">
                <strong>{r.faculty_name}</strong>
                <small>{r.period_label} — Updated {new Date(r.updated_at).toLocaleDateString()}</small>
              </span>
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
            <div class="rp-head-right">
              <span class="rp-pos">{position} / {total}</span>
              <StatusPill status={selected.status} />
            </div>
          </div>

          <!--
            The report itself sits above the decision box, always visible. Making
            the reviewer open a tab to see what they are approving put a click
            between reading a report and deciding on it.
          -->
          <div class="rp-body">
            {#if contentLoading}
              <AsyncState kind="loading" message="" />
            {:else if !reportContent}
              <div class="empty-state">Could not load report content.</div>
            {:else}
              <ReportPreview
                kicker="What was submitted"
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

          <div class="rp-decide">
            {#if reportContent?.reviews?.length}
              <details class="rp-reviews">
                <summary>Review history ({reportContent.reviews.length})</summary>
                {#each reportContent.reviews as rv}
                  <div class="rp-rv-row">
                    <StatusPill status={rv.decision} />
                    <span class="rv-text"><strong>{rv.reviewer_name}</strong>{rv.remarks ? ` — ${rv.remarks}` : ''}</span>
                  </div>
                {/each}
              </details>
            {/if}
            <label class="rp-label" for="review-remarks">Reviewer remarks</label>
            <textarea id="review-remarks" class="rp-textarea" bind:value={comment} bind:this={remarksBox} rows="3" placeholder="Record feedback for the faculty member…"></textarea>
            <div class="rp-btns">
              <button class="btn-approve" disabled={reviewBusy !== null} onclick={() => review('APPROVED')}>{reviewBusy === 'APPROVED' ? 'Approving…' : 'Approve'}<kbd>A</kbd></button>
              <button class="btn-changes" disabled={reviewBusy !== null} onclick={() => review('CHANGES_REQUIRED')}>{reviewBusy === 'CHANGES_REQUIRED' ? 'Sending…' : 'Request changes'}<kbd>C</kbd></button>
              <span class="rp-hint">Arrow keys move through the queue. The next undecided report opens by itself.</span>
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
  .review-layout { display: grid; grid-template-columns: 320px 1fr; gap: var(--sp-5); align-items: start; }
  /* Progress across the pass: one glance says how much reviewing is left. */
  .pass-bar { display: flex; align-items: center; gap: var(--sp-4); margin-bottom: var(--sp-5); }
  .pass-track { flex: 1; height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; }
  .pass-track i { display: block; height: 100%; background: var(--blue); border-radius: 999px; transition: width 0.3s ease; }
  .pass-bar.pass-done .pass-track i { background: var(--green); }
  .pass-text { font-size: var(--fs-sm); color: var(--text-3); font-weight: 600; white-space: nowrap; }
  .queue-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); }
  .queue-head { padding: 15px 18px; border-bottom: 1px solid var(--line); background: var(--head); color: var(--text-3); font-size: var(--fs-xs); font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
  .q-row { width: 100%; display: flex; gap: var(--sp-4); align-items: center; text-align: left; border: 0; border-bottom: 1px solid var(--line-2); border-left: 3px solid transparent; background: transparent; padding: var(--sp-4) 14px; cursor: pointer; font: inherit; color: var(--ink-2); transition: background 0.1s, border-color 0.1s; }
  .q-row:last-child { border-bottom: 0; }
  .q-row:hover { background: var(--head); }
  .q-row.chosen { background: var(--info-bg); border-left-color: var(--accent); }
  /* The queue number doubles as the keyboard hint for moving through it. */
  .q-pos { width: 20px; height: 20px; flex: none; border-radius: 999px; display: grid; place-items: center; background: var(--line-light); color: var(--text-3); font-size: var(--fs-xs); font-weight: 700; font-variant-numeric: tabular-nums; }
  .q-row.chosen .q-pos { background: var(--accent); color: #fff; }
  .q-info { flex: 1; min-width: 0; }
  .q-info strong, .q-info small { display: block; }
  .q-info strong { font-size: var(--fs-md); }
  .q-info small { color: var(--muted-2); margin-top: 3px; font-size: var(--fs-sm); }
  .q-empty { padding: var(--sp-7) 16px; color: var(--muted-2); font-size: var(--fs-md); }
  /* No overflow:hidden here — it would become the sticky containing block and
     pin the decision bar to the panel instead of the viewport. The corners are
     rounded on the first and last children instead. */
  .review-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
  .rp-head { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: var(--sp-6) 22px; border-bottom: 1px solid var(--line); background: var(--head); border-radius: var(--radius-md) var(--radius-md) 0 0; }
  .rp-head-info h2 { font-size: var(--fs-2xl); letter-spacing: -0.02em; margin: 0 0 2px; font-weight: 750; color: var(--text-1); }
  .rp-head-meta { font-size: var(--fs-md); color: var(--text-3); }
  .rp-head-right { display: flex; align-items: center; gap: var(--sp-3); }
  .rp-pos { font-size: var(--fs-sm); font-weight: 700; color: var(--text-3); font-variant-numeric: tabular-nums; }
  /* Content above the decision, so reading and deciding are one scroll. The
     decision bar sticks to the bottom so a long report never hides the buttons. */
  .rp-body { padding: var(--sp-7); }
  .rp-decide {
    position: sticky; bottom: 0; z-index: var(--z-raised);
    padding: var(--sp-6) 22px; background: var(--paper);
    border-top: 1px solid var(--line);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    box-shadow: 0 -6px 14px -10px rgb(0 0 0 / 0.22);
  }
  .rp-label { display: block; font-size: var(--fs-sm); font-weight: 700; color: var(--text-3); margin-bottom: var(--sp-2); }
  .rp-reviews { margin-bottom: var(--sp-5); }
  .rp-reviews summary { cursor: pointer; font-size: var(--fs-sm); font-weight: 700; color: var(--text-2); padding: var(--sp-2) 0; }
  .rp-body h3 { font-size: var(--fs-md); margin: 0 0 10px; color: var(--ink-2); }
  .rp-rv-row { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-3) 0; border-bottom: 1px solid var(--line-2); font-size: var(--fs-md); }
  .rp-rv-row:last-child { border-bottom: 0; }
  .rv-text { color: var(--muted); font-size: var(--fs-sm); }
  .rv-text strong { color: var(--ink-2); }
  .rp-textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 8px; padding: 11px 13px; font: inherit; font-size: var(--fs-md); background: var(--bg-input); color: var(--text-1); resize: vertical; margin-bottom: var(--sp-5); box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .rp-textarea:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .rp-btns { display: flex; gap: var(--sp-4); margin-bottom: var(--sp-5); align-items: center; flex-wrap: wrap; }
  .rp-hint { font-size: var(--fs-xs); color: var(--text-3); }
  .btn-approve, .btn-changes { border: 1px solid transparent; border-radius: 8px; padding: var(--sp-4) 18px; font: inherit; font-size: var(--fs-md); font-weight: 750; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.12s; display: inline-flex; align-items: center; gap: var(--sp-3); }
  .btn-approve kbd, .btn-changes kbd { font: inherit; font-size: var(--fs-xs); font-weight: 700; padding: 1px 5px; border-radius: 4px; background: rgb(255 255 255 / 0.18); }
  .btn-changes kbd { background: rgb(0 0 0 / 0.08); }
  .btn-approve:disabled, .btn-changes:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .btn-approve { background: var(--navy); border-color: var(--navy); color: var(--paper); }
  .btn-approve:hover { background: var(--accent-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .btn-changes { background: var(--red-bg-alt); border-color: var(--red-border); color: var(--red-dark); }
  .btn-changes:hover { background: var(--red-bg); box-shadow: var(--shadow-sm); }
  .rp-reopen summary { cursor: pointer; font-size: var(--fs-sm); color: var(--muted); padding: var(--sp-2) 0; }
  .rp-reopen-body { display: grid; gap: var(--sp-4); padding: var(--sp-4) 0; }
  .rp-reopen-body label { font-size: var(--fs-sm); font-weight: 700; color: var(--muted); }
  .rp-reopen-body input { border: 1px solid var(--line); border-radius: 5px; padding: var(--sp-3) 10px; font: inherit; background: var(--bg-input); width: 100%; box-sizing: border-box; margin-top: var(--sp-1); }
  .rp-reopen-body .btn { align-self: start; }
  .attach-list { display: grid; gap: var(--sp-3); margin-top: var(--sp-1); }
  .attach-row { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-4) 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 7px; }
  .attach-name { flex: 1; min-width: 0; font-size: var(--fs-sm); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty-state { color: var(--muted-2); font-size: var(--fs-sm); padding: var(--sp-4) 0; }
  @media (max-width: 800px) { .review-layout { grid-template-columns: 1fr; } }
  @media (max-width: 520px) { .rp-btns { flex-direction: column; } }
  .filter-bar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--sp-4); padding: var(--sp-4) 14px; border-bottom: 1px solid var(--line-2); background: var(--paper); }
  .filter-search, .filter-select { padding: var(--sp-3) 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1); font: inherit; font-size: var(--fs-md); }
  .filter-search { flex: 1; min-width: 160px; }
  .filter-search:focus, .filter-select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .btn-link { font-size: var(--fs-sm); color: var(--blue); text-decoration: none; font-weight: 700; }
  .btn-link:hover { text-decoration: underline; }
  .missing-panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; margin-bottom: var(--sp-7); box-shadow: var(--shadow-sm); }
  .missing-row { display: flex; justify-content: space-between; align-items: center; gap: var(--sp-4); padding: var(--sp-4) 20px; border-bottom: 1px solid var(--line-2); }
  .missing-row:last-child { border-bottom: 0; }
  .missing-row strong { display: block; font-size: var(--fs-md); color: var(--text-1); }
  .missing-row span { font-size: var(--fs-sm); color: var(--text-3); }
  .missing-empty { padding: var(--sp-6); text-align: center; color: var(--muted-2); font-size: var(--fs-md); }
</style>