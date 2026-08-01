<script lang="ts">
  let {
    data,
  }: {
    data: {
      report: Record<string, any>;
      teaching: Record<string, any>[];
      research: Record<string, any>[];
      duties: Record<string, any>[];
      outreach: Record<string, any>[];
      reviews: Record<string, any>[];
    };
  } = $props();
  const r = $derived(data.report);
</script>

<svelte:head><title>Printable faculty report · {r.period_label}</title></svelte:head>
<main class="print-page">
  <header>
    <div class="kicker">Faculty Reporting System</div>
    <h1>Faculty Weekly Report</h1>
    <p>Reporting period: {r.period_label}</p>
    <div class="person">
      <span><b>Faculty</b> {r.faculty_name ?? 'Faculty member'}</span><span
        ><b>Department</b> Computer Science and Engineering</span
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
            ><th>Syllabus</th></tr
          ></thead
        ><tbody
          >{#each data.teaching as item}<tr
              ><td>{item.course_code} · {item.course_name}</td><td>{item.program_level}</td><td>{item.class_type}</td
              ><td>{item.scheduled}</td><td>{item.conducted}</td><td>{item.missed}</td><td
                >{item.missed_action || '—'}</td
              ><td>{item.syllabus_completion ?? 0}%</td></tr
            >{/each}</tbody
        >
      </table>{:else}<p>No teaching records entered.</p>{/if}
  </section>
  <section>
    <h2>2. Weekly summary</h2>
    <div class="summary-box">{r.summary || 'No weekly summary entered.'}</div>
  </section>
  {#if data.reviews.length}<section>
      <h2>3. Review history</h2>
      {#each data.reviews as rv}<div class="review-line">
          <span class="rv-decision">{rv.decision}</span><strong>{rv.reviewer_name}</strong><span
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
    color: #1f2a2e;
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
    color: #145b78;
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
    color: #667477;
    margin: 0 0 18px;
  }
  .person {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    border-block: 1px solid #cbd8d1;
    padding: 12px 0;
    margin: 18px 0;
  }
  .person b {
    display: block;
    color: #667477;
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
    border-bottom: 2px solid #145b78;
    padding-bottom: 5px;
    margin: 0 0 10px;
  }
  .print-page p,
  .summary-box {
    color: #47646b;
    font-size: 11px;
    line-height: 1.55;
  }
  .summary-box {
    background: #f7f9fa;
    border: 1px solid #dce2dc;
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
    border: 1px solid #dce2dc;
    text-align: left;
    padding: 6px 5px;
  }
  .print-page th {
    background: #f5f7f8;
    color: #667477;
    font-size: 9px;
    text-transform: uppercase;
  }
  .review-line {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px solid #eef3f5;
    font-size: 10px;
  }
  .rv-decision {
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 9px;
  }
  .review-line p {
    width: 100%;
    margin: 4px 0 0;
    color: #71818a;
  }
  .print-page footer {
    border-top: 1px solid #dce2dc;
    margin-top: 40px;
    padding-top: 10px;
    color: #667477;
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
