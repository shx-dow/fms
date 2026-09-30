<script lang="ts">
  import ReportOverview from '$lib/components/ReportOverview.svelte';
  import ReviewerDashboard from '$lib/components/ReviewerDashboard.svelte';
  import type { Week } from '$lib/weeks';

  interface PeriodDetail {
    report?: { status: string } | null;
    reports?: { status: string }[];
  }

  let { data } = $props();

  function greetingName(name: string | undefined) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    const title = /^(Mr|Mrs|Ms|Miss|Dr|Prof)\.?$/i.test(parts[0]) ? parts.shift() : '';
    const firstName = parts[0] ?? '';
    return title ? `${title} ${firstName}` : firstName;
  }

  // A department head files a report like anyone else, so the same overview is
  // shown to both roles and the department view is added underneath.
  const showOverview = $derived(data.isReporter);
  const showDepartment = $derived(data.isReporter && data.departmentWeeks.length > 0);

  let selectedPeriod = $state<string | null>(null);
  let weekDetail = $state<PeriodDetail | null>(null);
  const currentPeriodId = $derived(data.departmentWeeks.find((w: Week) => Number(w.is_open) === 1)?.id ?? null);

  async function selectWeek(id: string) {
    selectedPeriod = id || null;
    weekDetail = null;
    if (!id) return;
    const res = await fetch(`/api/dashboard/weeks?scope=department&period=${id}`);
    weekDetail = await res.json();
  }
</script>

<svelte:head><title>Dashboard · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  {#if showOverview}
    <ReportOverview name={greetingName(data.user?.name)} report={data.report} weeks={data.weeks} />
  {/if}

  {#if showDepartment}
    <ReviewerDashboard
      {selectedPeriod}
      {weekDetail}
      {currentPeriodId}
      weeks={data.departmentWeeks}
      counts={data.departmentCounts}
      onselect={selectWeek}
    />
  {/if}
</main>
