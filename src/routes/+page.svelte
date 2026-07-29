<svelte:head>
  <title>Faculty Reporting System</title>
  <meta name="description" content="Structured faculty activity reporting" />
</svelte:head>

<main class="shell">
  <div class="eyebrow">The ICFAI University, Jaipur · Internal workspace</div>
  <section class="intro">
    <div>
      <h1>Faculty reporting, built for the academic week.</h1>
      <p>Track teaching delivery, submit weekly work before Friday at 6:00 PM, and give HODs a dependable review trail for every report.</p>
      <a class="button" href="/dashboard">Open faculty workspace <span>→</span></a>
    </div>
    <div class="foundation-note"><span class="dot"></span><div><strong>Reporting cycle open</strong><small>Weekly report · deadline Friday, 6:00 PM</small></div></div>
  </section>
  <div class="route-grid">
    <a href="/dashboard"><span>01</span><strong>Faculty workspace</strong><small>Current period, deadline, and next action</small></a>
    <a href="/reports/current"><span>02</span><strong>Weekly report</strong><small>Teaching delivery and weekly summary</small></a>
    <a href="/admin"><span>03</span><strong>HOD review</strong><small>Department status and reports awaiting review</small></a>
  </div>
</main>
