<script lang="ts">
  import { onMount } from 'svelte';
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
  let error = $state('');
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDay = $derived(new Date(currentYear, currentMonth, 1).getDay());
  const daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());
  const days = $derived.by(() => {
    const d: number[] = [];
    for (let i = 1; i <= daysInMonth; i++) d.push(i);
    return d;
  });
  const today = $derived(new Date().toISOString().slice(0, 10));
  function isToday(day: number) {
    const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ds === today;
  }
  function isSelected(day: number) {
    const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ds === selectedDate;
  }
  const user = $derived(data.user);
  const isFaculty = $derived(user?.role === 'FACULTY');
  const statusClass = (s: string) =>
    s === 'SUBMITTED'
      ? 'submitted'
      : s === 'APPROVED'
        ? 'approved'
        : s === 'CHANGES_REQUIRED'
          ? 'changes_required'
          : '';
  const statusLabel = (s: string) =>
    s === 'CHANGES_REQUIRED' ? 'Changes required' : s.charAt(0) + s.slice(1).toLowerCase();
  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    selectDate(1);
  }
  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    selectDate(1);
  }
  function selectDate(day: number) {
    selectedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    loadReports();
  }
  async function loadReports() {
    loading = true;
    error = '';
    try {
      const response = await fetch(`/api/report-calendar?date=${selectedDate}`);
      const d = await response.json();
      if (!response.ok) {
        error = d.error ?? 'Unable to load reports.';
        reports = [];
      } else reports = d.reports ?? [];
    } catch {
      error = 'Unable to load reports.';
      reports = [];
    } finally {
      loading = false;
    }
  }
  onMount(loadReports);
</script>

<svelte:head><title>Report calendar · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  <div class="breadcrumb">Workspace <span>/</span> Report calendar</div>
  <section class="page-head">
    <div>
      <div class="eyebrow">Reports by date</div>
      <h1>Report calendar</h1>
      <p>Click a date on the calendar to view reports submitted or updated on that day.</p>
    </div>
  </section>
  <div class="calendar-layout">
    <div class="calendar-widget">
      <div class="cal-header">
        <button class="cal-nav" onclick={prevMonth}>←</button><span class="cal-month-label"
          >{monthNames[currentMonth]} {currentYear}</span
        ><button class="cal-nav" onclick={nextMonth}>→</button>
      </div>
      <div class="cal-grid">
        <div class="cal-day-header">Sun</div>
        <div class="cal-day-header">Mon</div>
        <div class="cal-day-header">Tue</div>
        <div class="cal-day-header">Wed</div>
        <div class="cal-day-header">Thu</div>
        <div class="cal-day-header">Fri</div>
        <div class="cal-day-header">Sat</div>
        {#each Array(firstDay) as _}<div class="cal-day cal-day-empty"></div>{/each}{#each days as day}<button
            class="cal-day {isToday(day) ? 'cal-today' : ''} {isSelected(day) ? 'cal-selected' : ''}"
            onclick={() => selectDate(day)}>{day}</button
          >{/each}
      </div>
    </div>
    <div class="calendar-reports">
      <div class="panel-title">
        <h2>{selectedDate}</h2>
        <p>
          {loading ? 'Loading reports…' : `${reports.length} report${reports.length === 1 ? '' : 's'} on this date`}
        </p>
      </div>
      <div class="reports-list">
        {#if loading}<div class="loading-inline"><span class="spinner"></span></div>{:else if error}<div
            class="notice error"
          >
            {error}
          </div>{:else if !reports.length}<div class="empty-state">
            <div class="empty-icon">📅</div>
            <p>No submitted reports found for this date.</p>
          </div>{:else}{#each reports as report}<a
              class="report-card {statusClass(report.status)}"
              href={isFaculty
                ? report.status === 'SUBMITTED' || report.status === 'APPROVED' || report.status === 'CHANGES_REQUIRED'
                  ? '/reports'
                  : '/reports/current'
                : `/admin/reports?report=${report.id}`}
              ><div class="card-left">
                {#if !isFaculty}<span class="faculty-avatar">{report.faculty_name.charAt(0).toUpperCase()}</span>{/if}
                <div>
                  <strong>{report.faculty_name}</strong>{#if !isFaculty}<small>{report.faculty_email}</small>{/if}<small
                    class="period-label">{report.period_label}</small
                  >
                </div>
              </div>
              <div class="card-right">
                <span class="status-pill {statusClass(report.status)}">{statusLabel(report.status)}</span><span
                  class="completion">{report.completion}%</span
                >
              </div></a
            >{/each}{/if}
      </div>
    </div>
  </div>
</main>

<style>
  .shell {
    padding-top: 24px;
  }
  .breadcrumb {
    font-size: 0.73rem;
    color: #71818a;
    margin-bottom: 28px;
  }
  .breadcrumb span {
    padding: 0 8px;
    color: #b2bdc1;
  }
  .page-head {
    margin-bottom: 32px;
  }
  .page-head h1 {
    font-size: 2.35rem;
    letter-spacing: -0.045em;
    margin: 6px 0 6px;
  }
  .page-head p {
    margin: 0;
    color: #667477;
    font-size: 0.92rem;
  }
  .calendar-layout {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 28px;
    align-items: start;
  }
  .calendar-widget {
    background: #fdfcf9;
    border: 1px solid #dbe3e7;
    border-radius: 10px;
    padding: 22px;
    position: sticky;
    top: 24px;
  }
  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
  }
  .cal-month-label {
    font-weight: 800;
    font-size: 1rem;
    color: #1b2b36;
  }
  .cal-nav {
    border: 0;
    background: 0;
    color: #61727d;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 5px;
    font-weight: 700;
  }
  .cal-nav:hover {
    background: #eef3f5;
    color: #1b2b36;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  .cal-day-header {
    font-size: 0.66rem;
    font-weight: 800;
    color: #71818a;
    text-align: center;
    padding: 6px 0;
  }
  .cal-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.79rem;
    border-radius: 6px;
    color: #1b2b36;
    border: 0;
    background: 0;
    cursor: pointer;
    transition: all 0.12s;
  }
  .cal-day:hover {
    background: #eef3f5;
  }
  .cal-day-empty {
    cursor: default;
  }
  .cal-today {
    font-weight: 800;
    background: #e4f3ef;
    color: #087f73;
  }
  .cal-selected {
    background: #172a3a;
    color: #f6f9fa;
    font-weight: 700;
  }
  .cal-selected:hover {
    background: #223d52;
  }
  .calendar-reports {
    background: #fdfcf9;
    border: 1px solid #dbe3e7;
    border-radius: 10px;
    overflow: hidden;
  }
  .panel-title {
    padding: 20px 22px;
    border-bottom: 1px solid #dbe3e7;
  }
  .panel-title h2 {
    margin: 0;
    font-size: 1.04rem;
    font-weight: 800;
  }
  .panel-title p {
    margin: 4px 0 0;
    color: #71818a;
    font-size: 0.76rem;
  }
  .reports-list {
    min-height: 180px;
  }
  .loading-inline {
    padding: 44px;
    display: flex;
    justify-content: center;
  }
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #dbe3e7;
    border-top-color: #087f73;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .report-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 22px;
    border-bottom: 1px solid #eef3f5;
    text-decoration: none;
    color: #1b2b36;
    transition: background 0.12s;
  }
  .report-card:last-child {
    border-bottom: 0;
  }
  .report-card:hover {
    background: #f7fafb;
  }
  .card-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .card-left strong {
    display: block;
    font-size: 0.9rem;
  }
  .card-left small {
    display: block;
    color: #71818a;
    font-size: 0.71rem;
    margin-top: 2px;
  }
  .period-label {
    color: #a5b4b9 !important;
    font-size: 0.65rem !important;
    margin-top: 3px !important;
  }
  .card-right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: none;
  }
  .faculty-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #e4f3ef;
    color: #087f73;
    display: grid;
    place-items: center;
    font-size: 0.7rem;
    font-weight: 800;
    flex: none;
  }
  .status-pill {
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 800;
  }
  .status-pill.submitted {
    background: #e6f0f4;
    color: #3a7083;
  }
  .status-pill.approved {
    background: #e4f3ef;
    color: #167166;
  }
  .status-pill.changes_required {
    background: #fff2d9;
    color: #896015;
  }
  .completion {
    color: #87969c;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .empty-state {
    text-align: center;
    padding: 44px 22px;
    color: #87969c;
  }
  .empty-icon {
    font-size: 1.8rem;
    margin-bottom: 10px;
  }
  .empty-state p {
    margin: 0;
    font-size: 0.88rem;
  }
  .notice {
    padding: 44px 22px;
    color: #87969c;
  }
  .error {
    color: #8f413b;
  }
  @media (max-width: 850px) {
    .calendar-layout {
      grid-template-columns: 1fr;
    }
    .calendar-widget {
      position: static;
      max-width: 340px;
      margin-bottom: 0;
    }
    .page-head h1 {
      font-size: 1.9rem;
    }
  }
  @media (max-width: 620px) {
    .report-card {
      flex-direction: column;
      align-items: start;
      gap: 10px;
    }
    .card-right {
      align-self: end;
    }
  }
</style>
