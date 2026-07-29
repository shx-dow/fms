<svelte:head>
  <title>Faculty Reporting System</title>
  <meta name="description" content="Structured faculty activity reporting" />
</svelte:head>

<main class="shell">
  <div class="eyebrow">Faculty Reporting System · Foundation</div>
  <section class="intro">
    <div>
      <h1>A clear home for every faculty report.</h1>
      <p>Phase 2 is in place: the application shell, domain types and visual foundation are ready for authentication and persistence.</p>
      <a class="button" href="/dashboard">Open dashboard preview <span>→</span></a>
    </div>
    <div class="foundation-note"><span class="dot"></span><div><strong>System foundation ready</strong><small>SvelteKit · TypeScript · typed reporting domain</small></div></div>
  </section>
  <div class="route-grid">
    <a href="/dashboard"><span>01</span><strong>Faculty dashboard</strong><small>Current period and report attention</small></a>
    <a href="/reports"><span>02</span><strong>Reports</strong><small>Drafts and submission history</small></a>
    <a href="/admin"><span>03</span><strong>Review workspace</strong><small>HOD and admin entry point</small></a>
  </div>
</main>
