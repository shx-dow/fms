<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  let { data } = $props();
  type Report = {
    id: string;
    status: string;
    completion: number;
    submitted_at?: string;
    updated_at: string;
    faculty_name: string;
    faculty_email: string;
    period_label: string;
  };
  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());
  let selectedDate = $state(new Date().toISOString().slice(0, 10));
  let reports: Report[] = $state([]);
  let loading = $state(false);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayHeaders = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = $derived(new Date(currentYear, currentMonth, 1).getDay());
  const daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());
  const days = $derived.by(() => { const d: number[] = []; for (let i = 1; i <= daysInMonth; i++) d.push(i); return d; });
  const today = $derived(new Date().toISOString().slice(0, 10));
  function isToday(day: number) {
    return `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` === today;
  }
  function isSelected(day: number) {
    return `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` === selectedDate;
  }
  const user = $derived(data.user);
  const isFaculty = $derived(user?.role === 'FACULTY');
  const statusPillClass = (s: string) =>
    s === 'SUBMITTED' ? 'r-sub' : s === 'APPROVED' ? 'r-ok' : s === 'CHANGES_REQUIRED' ? 'r-chg' : '';
  const statusLabel = (s: string) =>
    s === 'CHANGES_REQUIRED' ? 'Changes requested' : s.charAt(0) + s.slice(1).toLowerCase();
  function prevMonth() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; }
    else { currentMonth--; }
    selectDate(1);
  }
  function nextMonth() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; }
    else { currentMonth++; }
    selectDate(1);
  }
  function selectDate(day: number) {
    selectedDate = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    loadReports();
  }
  async function loadReports() {
    loading = true;
    try {
      const res = await fetch(`/api/report-calendar?date=${selectedDate}`);
      const d = await res.json();
      if (!res.ok) { show(d.error ?? 'Unable to load reports.', 'err'); reports = []; }
      else reports = d.reports ?? [];
    } catch { show('Unable to load reports.', 'err'); reports = []; }
    finally { loading = false; }
  }
  onMount(loadReports);
  const fmtDate = $derived(new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
</script>

<svelte:head><title>Calendar · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  <header class="dash-header">
    <div>
      <h1>Calendar</h1>
      <span class="dash-period">Reports by date</span>
    </div>
  </header>

  <div class="cal-layout">
    <div class="cal-widget">
      <div class="cal-head">
        <button class="cal-nav" onclick={prevMonth}>←</button>
        <span class="cal-label">{monthNames[currentMonth]} {currentYear}</span>
        <button class="cal-nav" onclick={nextMonth}>→</button>
      </div>
      <div class="cal-grid">
        {#each dayHeaders as h}<div class="cal-dh">{h}</div>{/each}
        {#each Array(firstDay) as _}<div class="cal-day empty"></div>{/each}
        {#each days as day}
          <button class="cal-day" class:today={isToday(day)} class:sel={isSelected(day)} onclick={() => selectDate(day)}>{day}</button>
        {/each}
      </div>
    </div>

    <section class="cal-reports">
      <div class="panel-head">
        <h2>{fmtDate}</h2>
        <span class="cal-count">{loading ? 'Loading…' : `${reports.length} report${reports.length === 1 ? '' : 's'}`}</span>
      </div>
      <div class="cal-list">
        {#if loading}
          <div class="cal-empty"><span class="spinner"></span></div>
        {:else if !reports.length}
          <div class="cal-empty">No reports found for this date.</div>
        {:else}
          {#each reports as report}
            <a class="cal-row" href={isFaculty ? '/reports' : `/admin/reports?report=${report.id}`}>
              <div class="cal-row-left">
                {#if !isFaculty}
                  <span class="cal-avatar">{report.faculty_name.charAt(0)}</span>
                {/if}
                <div>
                  <strong>{report.faculty_name}</strong>
                  {#if !isFaculty}<small>{report.faculty_email}</small>{/if}
                  <span class="cal-period">{report.period_label}</span>
                </div>
              </div>
              <div class="cal-row-right">
                <span class="report-pill {statusPillClass(report.status)}">{statusLabel(report.status)}</span>
                <span class="cal-completion">{report.completion}%</span>
              </div>
            </a>
          {/each}
        {/if}
      </div>
    </section>
  </div>
</main>

<style>
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: #667477; }
  .cal-layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; }
  .cal-widget { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; padding: 20px; position: sticky; top: 20px; }
  .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .cal-label { font-weight: 800; font-size: 0.95rem; color: #1b2b36; }
  .cal-nav { border: 0; background: 0; color: #71818a; font-size: 1rem; cursor: pointer; padding: 6px 10px; border-radius: 5px; font-weight: 700; }
  .cal-nav:hover { background: #eef3f5; color: #1b2b36; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .cal-dh { font-size: 0.62rem; font-weight: 800; color: #87969c; text-align: center; padding: 6px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  .cal-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 0.76rem; border-radius: 6px; color: #1b2b36; border: 0; background: 0; cursor: pointer; transition: all 0.12s; }
  .cal-day:hover { background: #eef3f5; }
  .cal-day.empty { cursor: default; }
  .cal-day.today { font-weight: 800; background: #e5f0f4; color: #145b78; }
  .cal-day.sel { background: #17252d; color: #f4f6f5; font-weight: 700; }
  .cal-day.sel:hover { background: #294a5a; }
  .cal-reports { background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #dbe3e7; }
  .panel-head h2 { font-size: 0.82rem; margin: 0; font-weight: 800; color: #1b2b36; }
  .cal-count { font-size: 0.72rem; color: #87969c; }
  .cal-list { min-height: 140px; }
  .cal-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #e8eeec; text-decoration: none; color: #1b2b36; transition: background 0.1s; }
  .cal-row:last-child { border-bottom: 0; }
  .cal-row:hover { background: #f4f6f5; }
  .cal-row-left { display: flex; align-items: center; gap: 11px; min-width: 0; flex: 1; }
  .cal-row-left strong { display: block; font-size: 0.82rem; }
  .cal-row-left small { display: block; color: #71818a; font-size: 0.68rem; margin-top: 1px; }
  .cal-period { display: block; color: #a5b4b9; font-size: 0.64rem; margin-top: 2px; }
  .cal-avatar { width: 26px; height: 26px; border-radius: 50%; background: #e5f0f4; color: #145b78; display: grid; place-items: center; font-size: 0.68rem; font-weight: 800; flex: none; }
  .cal-row-right { display: flex; align-items: center; gap: 12px; flex: none; }
  .report-pill { font-size: 0.63rem; font-weight: 800; padding: 3px 7px; border-radius: 4px; letter-spacing: 0.02em; }
  .r-sub { background: #e5f0f4; color: #145b78; }
  .r-ok { background: #e4f1eb; color: #24745b; }
  .r-chg { background: #f4eddd; color: #8a681d; }
  .cal-completion { color: #87969c; font-size: 0.76rem; font-weight: 700; }
  .cal-empty { padding: 44px 20px; text-align: center; color: #87969c; font-size: 0.8rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dbe3e7; border-top-color: #145b78; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 850px) {
    .cal-layout { grid-template-columns: 1fr; }
    .cal-widget { position: static; max-width: 320px; }
  }
  @media (max-width: 620px) {
    .cal-row { flex-direction: column; align-items: start; gap: 8px; }
    .cal-row-right { align-self: end; }
  }
</style>