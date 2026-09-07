<script lang="ts">
  import type { ReportForPdf } from '$lib/server/db/repositories/reports';
  import type { TeachingDbRow, ResearchDbRow, DutyDbRow, OutreachDbRow } from '$lib/server/db/repositories/activity';
  import type { ReviewRow } from '$lib/server/db/repositories/reviews';
  let {
    data,
  }: {
    data: {
      report: ReportForPdf & { period_label: string };
      teaching: TeachingDbRow[];
      research: ResearchDbRow[];
      duties: DutyDbRow[];
      outreach: OutreachDbRow[];
      reviews: ReviewRow[];
    };
  } = $props();
  const r = $derived(data.report);
  // Legacy "N/A" sentinel rows (pre empty-flag) never render as real records.
  const research = $derived(data.research.filter((x) => (x.title ?? '').trim() && x.title !== 'N/A'));
  const duties = $derived(data.duties.filter((x) => (x.name ?? '').trim() && x.name !== 'N/A'));
  const outreach = $derived(data.outreach.filter((x) => (x.activity ?? '').trim() && x.activity !== 'N/A'));
</script>

<svelte:head><title>Printable faculty report · {r.period_label}</title></svelte:head>
<main class="print-page">
  <header>
    <div class="kicker">Faculty Reporting System</div>
    <h1>Faculty Weekly Report</h1>
    <p>Reporting period: {r.period_label}</p>
    <div class="person">
      <span><b>Faculty</b> {r.faculty_name ?? 'Faculty member'}</span><span
        ><b>Department</b> {r.department_name ?? '—'}</span
      ><span><b>Status</b> {r.status}</span><span
        ><b>Submitted</b> {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'Not submitted'}</span
      ><span><b>Completion</b> {r.completion ?? 0}%</span>
    </div>
  </header>
  <section>
    <h2>1. Teaching & academic delivery</h2>
    {#if data.teaching.length}<table>
        <thead
          ><tr
            ><th>Course</th><th>Program</th><th>Type</th><th>Scheduled</th><th>Taken</th><th>Missed</th><th>Action</th
            ><th>Lecture covered up to</th></tr
          ></thead
        ><tbody
          >{#each data.teaching as item}<tr
              ><td>{item.course_code} · {item.course_name}</td><td>{item.program_level}</td><td>{item.class_type}</td
              ><td>{item.scheduled}</td><td>{item.conducted}</td><td>{item.missed}</td><td
                >{item.missed_action || '—'}</td
              ><td>{item.syllabus_lecture ?? '—'}</td></tr
            >{/each}</tbody
        >
      </table>{:else}<p>No teaching records entered.</p>{/if}
  </section>
  <section>
    <h2>2. Research & publications</h2>
    {#if research.length}<table>
        <thead><tr><th>Title</th><th>Category</th><th>Venue / agency</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>{#each research as item}<tr><td>{item.title || '—'}</td><td>{item.category || '—'}</td><td>{item.venue_or_agency || '—'}</td><td>{item.role || '—'}</td><td>{item.status || '—'}</td></tr>{/each}</tbody>
      </table>{:else}<p>No research records entered.</p>{/if}
  </section>
  <section>
    <h2>3. Institutional duties</h2>
    {#if duties.length}<table>
        <thead><tr><th>Duty / committee</th><th>Role</th><th>Activity</th><th>Outcome</th></tr></thead>
        <tbody>{#each duties as item}<tr><td>{item.name || '—'}</td><td>{item.role || '—'}</td><td>{item.activity || '—'}</td><td>{item.outcome || '—'}</td></tr>{/each}</tbody>
      </table>{:else}<p>No institutional duties entered.</p>{/if}
  </section>
  <section>
    <h2>4. Outreach & admissions</h2>
    {#if outreach.length}<table>
        <thead><tr><th>Activity</th><th>Audience</th><th>Date</th><th>Outcome</th></tr></thead>
        <tbody>{#each outreach as item}<tr><td>{item.activity || '—'}</td><td>{item.audience || '—'}</td><td>{item.date || '—'}</td><td>{item.outcome || '—'}</td></tr>{/each}</tbody>
      </table>{:else}<p>No outreach activity entered.</p>{/if}
  </section>
  <section>
    <h2>5. Weekly summary</h2>
    <div class="summary-box">{r.summary || 'No weekly summary entered.'}</div>
  </section>
  {#if data.reviews.length}<section>
      <h2>6. Review history</h2>
      {#each data.reviews as rv}<div class="review-line">
          <span class="rv-decision" class:rv-ok={rv.decision === 'APPROVED'} class:rv-chg={rv.decision === 'CHANGES_REQUIRED'}>{rv.decision === 'APPROVED' ? 'Approved' : rv.decision === 'CHANGES_REQUIRED' ? 'Changes requested' : rv.decision}</span><strong>{rv.reviewer_name}</strong><span
            >· {new Date(rv.created_at).toLocaleDateString()}</span
          >{#if rv.remarks}<p>{rv.remarks}</p>{/if}
        </div>{/each}
    </section>{/if}
  <footer>Generated from Faculty Reporting System · {r.period_label} · {new Date().toLocaleDateString()}</footer>
</main>

<style>
  @page {
    size: A4;
    margin: 16mm;
  }
  :global(body) {
    background: #fff;
    color: var(--ink);
    font:
      11px/1.5 'Segoe UI',
      Arial,
      sans-serif;
  }
  .print-page {
    max-width: 800px;
    margin: 0 auto;
  }
  .kicker {
    color: var(--blue);
    text-transform: uppercase;
    letter-spacing: 0.13em;
    font-size: 9px;
    font-weight: 700;
  }
  .print-page h1 {
    font-size: 28px;
    margin: 8px 0 3px;
    letter-spacing: -0.03em;
  }
  .print-page header > p {
    color: var(--muted);
    margin: 0 0 18px;
  }
  .person {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    border-block: 1px solid var(--line);
    padding: 12px 0;
    margin: 18px 0;
  }
  .person b {
    display: block;
    color: var(--muted);
    font-size: 9px;
    text-transform: uppercase;
  }
  .person span {
    font-size: 10px;
  }
  .print-page section {
    margin-top: 24px;
  }
  .print-page h2 {
    font-size: 14px;
    border-bottom: 2px solid var(--blue);
    padding-bottom: 5px;
    margin: 0 0 10px;
  }
  .print-page p,
  .summary-box {
    color: var(--muted-2);
    font-size: 11px;
    line-height: 1.55;
  }
  .summary-box {
    background: var(--bg-input);
    border: 1px solid var(--line-light);
    border-radius: 4px;
    padding: 12px;
    white-space: pre-wrap;
  }
  .print-page table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
  }
  .print-page th,
  .print-page td {
    border: 1px solid var(--line-light);
    text-align: left;
    padding: 6px 5px;
  }
  .print-page th {
    background: var(--bg-input);
    color: var(--muted);
    font-size: 9px;
    text-transform: uppercase;
  }
  .review-line {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px solid var(--bg-hover);
    font-size: 10px;
  }
  .rv-decision {
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 9px;
    background: var(--bg-hover);
    color: var(--muted-2);
  }
  .rv-decision.rv-ok { background: var(--success-bg); color: var(--green); }
  .rv-decision.rv-chg { background: var(--red-soft); color: var(--red-dark); }
  .review-line p {
    width: 100%;
    margin: 4px 0 0;
    color: var(--muted-3);
  }
  .print-page footer {
    border-top: 1px solid var(--line-light);
    margin-top: 40px;
    padding-top: 10px;
    color: var(--muted);
    font-size: 9px;
  }
  @media print {
    :global(body) {
      background: #fff;
    }
    .print-page {
      margin: 0;
    }
    .print-page section {
      page-break-inside: avoid;
    }
  }
  @media (max-width: 700px) {
    .person {
      grid-template-columns: 1fr 1fr;
    }
    .print-page table {
      font-size: 9px;
    }
  }
</style>
