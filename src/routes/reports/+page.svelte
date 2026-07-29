<svelte:head><title>Reports · Faculty Reporting System</title></svelte:head>
<script lang="ts">
  let { data } = $props();
  import { onMount } from 'svelte';
  let currentPeriod = $state(''); let currentStatus = $state(''); let currentCompletion = $state(0); let loading = $state(true);
  onMount(async () => {
    try {
      const res = await fetch('/api/reports');
      const d = await res.json();
      currentPeriod = d.policy?.period?.label ?? '';
      currentStatus = d.report?.status === 'SUBMITTED' ? 'Submitted' : d.report?.status === 'APPROVED' ? 'Approved' : d.report?.status === 'CHANGES_REQUIRED' ? 'Changes required' : d.report?.status ? 'Draft' : '—';
      currentCompletion = d.report?.completion ?? 0;
    } catch {} finally { loading = false; }
  });
</script>
<main class="shell app-shell"><div class="breadcrumb">Faculty workspace <span>/</span> Reports</div><div class="page-heading"><div><div class="eyebrow">Faculty portal</div><h1>Report history</h1><p>Draft, submit and revisit your activity reports.</p></div><a class="button" href="/reports/current">Open current report <span>→</span></a></div>{#if loading}<div class="loading-state"><span class="spinner"></span><span>Loading reports…</span></div>{:else}<section class="history report-list"><div class="report-row"><span><strong>{currentPeriod || 'Current period'}</strong></span><span class="status {currentStatus === 'Changes required' ? 'changes' : currentStatus.toLowerCase()}">{currentStatus === 'Draft' ? `Draft · ${currentCompletion}%` : currentStatus}</span><span>Current week</span><a href="/reports/current">Open →</a></div></section><p class="history-note">View all submitted reports across dates in the <a href="/calendar">report calendar →</a></p>{/if}</main>
<style>.breadcrumb{font-size:.73rem;color:#71818a;margin-bottom:8px}.breadcrumb span{padding:0 8px;color:#b2bdc1}.loading-state{display:flex;align-items:center;gap:12px;padding:24px 0;color:#71818a;font-size:.88rem}.spinner{width:18px;height:18px;border:2px solid #dbe3e7;border-top-color:#087f73;border-radius:50%;animation:spin .6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.history-note{margin-top:18px;color:#87969c;font-size:.8rem}.history-note a{color:#087f73;text-decoration:none;font-weight:750}</style>