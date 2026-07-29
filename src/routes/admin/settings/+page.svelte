<script lang="ts">
  import { onMount } from 'svelte';
  import { show } from '$lib/stores/toast.svelte.ts';
  let period: { id: string; label: string; starts_on: string; ends_on: string; due_on: string; is_open: number } | null = $state(null);
  let error = $state('');
  let loading = $state(true);
  onMount(async () => {
    try {
      const res = await fetch('/api/periods');
      const d = await res.json();
      period = (d.periods ?? []).find((p: any) => p.is_open) ?? (d.periods ?? [])[0] ?? null;
    } catch { error = 'Unable to load periods.'; }
    finally { loading = false; }
  });
  async function savePeriod() {
    if (!period) return;
    const res = await fetch('/api/periods', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: period.id, label: period.label, startsOn: period.starts_on, endsOn: period.ends_on, dueOn: period.due_on, isOpen: period.is_open }) });
    if (res.ok) show('Settings saved.');
    else show('Unable to save settings.', 'err');
  }
  const fmtDate = (iso: string, opts?: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString('en-IN', opts ?? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
</script>

<svelte:head><title>Reporting periods · Faculty Reporting System</title></svelte:head>
<main class="shell">
  <header class="dash-header">
    <div>
      <h1>Reporting periods</h1>
      <span class="dash-period">Weekly schedule configuration</span>
    </div>
  </header>
  {#if error}<div class="msg err">{error}</div>{/if}
  {#if loading}
    <div class="dash-loading"><span class="spinner"></span><span>Loading…</span></div>
  {:else if !period}
    <div class="empty-state">No reporting periods configured.</div>
  {:else}
    <section class="settings-card">
      <div class="setting-head">
        <div>
          <h2>{period.label}</h2>
          <p class="setting-deadline">Deadline {fmtDateTime(period.due_on)}.</p>
        </div>
        <span class="status-pill" class:open={period.is_open} class:closed={!period.is_open}>{period.is_open ? 'Open' : 'Closed'}</span>
      </div>
      <dl class="setting-dl">
        <div><dt>Cadence</dt><dd>Weekly</dd></div>
        <div><dt>Period end</dt><dd>{fmtDate(period.ends_on)}</dd></div>
        <div><dt>Submission deadline</dt><dd>{fmtDateTime(period.due_on)}</dd></div>
        <div><dt>Timezone</dt><dd>Asia/Calcutta</dd></div>
      </dl>
      <div class="setting-acts"><button class="dash-cta" onclick={savePeriod}>Save settings</button></div>
    </section>
  {/if}
</main>

<style>
  .dash-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; color: #71818a; font-size: 0.88rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid #dbe3e7; border-top-color: #145b78; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dash-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 28px; }
  .dash-header h1 { font-size: 1.65rem; letter-spacing: -0.03em; margin: 0 0 3px; }
  .dash-period { font-size: 0.82rem; color: #667477; }
  .dash-cta { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; background: #17252d; color: #f4f6f5; text-decoration: none; font-size: 0.78rem; font-weight: 700; white-space: nowrap; border: 0; cursor: pointer; transition: background 0.14s ease; }
  .dash-cta:hover { background: #294a5a; }
  .msg.err { background: #f9e9e7; color: #8f413b; }
  .empty-state { padding: 24px; color: #87969c; font-size: 0.82rem; }
  .settings-card { max-width: 720px; background: #fdfcf9; border: 1px solid #dbe3e7; border-radius: 8px; overflow: hidden; }
  .setting-head { display: flex; justify-content: space-between; gap: 20px; padding: 20px; border-bottom: 1px solid #dbe3e7; }
  .settings-card h2 { margin: 0; font-size: 1.1rem; }
  .setting-deadline { color: #667477; margin: 5px 0 0; font-size: 0.78rem; }
  .status-pill { flex: none; font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; align-self: start; }
  .status-pill.open { background: #e4f1eb; color: #24745b; }
  .status-pill.closed { background: #eef3f5; color: #71818a; }
  .setting-dl { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; padding: 20px; margin: 0; }
  .setting-dl dt { color: #87969c; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.62rem; font-weight: 800; }
  .setting-dl dd { margin: 5px 0 0; color: #1b2b36; font-size: 0.82rem; }
  .setting-acts { display: flex; justify-content: flex-end; padding: 0 20px 20px; }
  @media (max-width: 600px) { .setting-head { flex-direction: column; } .setting-dl { grid-template-columns: 1fr; } }
</style>