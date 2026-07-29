<script lang="ts">
  import { onMount } from 'svelte';
  let period: {
    id: string;
    label: string;
    starts_on: string;
    ends_on: string;
    due_on: string;
    is_open: number;
  } | null = $state(null);
  let saved = $state(false);
  let error = $state('');
  let loading = $state(true);
  onMount(async () => {
    try {
      const response = await fetch('/api/periods');
      const data = await response.json();
      period = (data.periods ?? []).find((p: any) => p.is_open) ?? (data.periods ?? [])[0] ?? null;
    } catch {
      error = 'Unable to load periods.';
    } finally {
      loading = false;
    }
  });
  async function savePeriod() {
    if (!period) return;
    const response = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: period.id,
        label: period.label,
        startsOn: period.starts_on,
        endsOn: period.ends_on,
        dueOn: period.due_on,
        isOpen: period.is_open,
      }),
    });
    saved = response.ok;
    error = response.ok ? '' : 'Unable to save reporting-period settings.';
  }
</script>

<svelte:head><title>Reporting periods · Faculty Reporting System</title></svelte:head>
<main class="shell app-shell">
  <div class="breadcrumb">Administration <span>/</span> Reporting periods</div>
  <div class="page-heading">
    <div>
      <div class="eyebrow">Administration</div>
      <h1>Reporting periods</h1>
      <p>Configure the weekly reporting window and submission deadline.</p>
    </div>
  </div>
  {#if loading}<div class="loading-panel">
      <span class="spinner"></span><span>Loading periods…</span>
    </div>{:else if !period}<div class="no-data">No reporting periods configured.</div>{:else}{#if saved}<div
        class="saved"
      >
        Reporting-period settings saved.
      </div>{/if}{#if error}<div class="error-msg">{error}</div>{/if}
    <section class="settings-panel">
      <div class="setting-head">
        <div>
          <h2>{period.label}</h2>
          <p>
            Deadline {new Date(period.due_on).toLocaleString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: 'numeric',
              minute: '2-digit',
            })}.
          </p>
        </div>
        <span class="status-pill submitted">{period.is_open ? 'Open' : 'Closed'}</span>
      </div>
      <dl>
        <div>
          <dt>Cadence</dt>
          <dd>Weekly</dd>
        </div>
        <div>
          <dt>Period end</dt>
          <dd>
            {new Date(period.ends_on).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </dd>
        </div>
        <div>
          <dt>Submission deadline</dt>
          <dd>
            {new Date(period.due_on).toLocaleString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>Asia/Calcutta</dd>
        </div>
      </dl>
      <div class="settings-actions"><button class="approve" onclick={savePeriod}>Save current settings</button></div>
    </section>{/if}
</main>

<style>
  .breadcrumb {
    font-size: 0.73rem;
    color: #71818a;
    margin-bottom: 8px;
  }
  .breadcrumb span {
    padding: 0 8px;
    color: #b2bdc1;
  }
  .loading-panel {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px;
    color: #71818a;
    font-size: 0.88rem;
  }
  .spinner {
    width: 18px;
    height: 18px;
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
  .no-data {
    padding: 24px;
    color: #87969c;
    font-size: 0.82rem;
  }
  .settings-panel {
    max-width: 760px;
    background: #fdfcf9;
    border: 1px solid #dbe3e7;
    border-radius: 7px;
    padding: 26px;
  }
  .setting-head {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    border-bottom: 1px solid #dbe3e7;
    padding-bottom: 20px;
  }
  .settings-panel h2 {
    margin: 0;
    font-size: 1.1rem;
  }
  .settings-panel p {
    color: #71818a;
    margin: 5px 0 0;
    font-size: 0.78rem;
  }
  .status-pill {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 800;
    align-self: start;
  }
  .status-pill.submitted {
    background: #e6f0f4;
    color: #3a7083;
  }
  .settings-panel dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin: 24px 0;
  }
  .settings-panel dt {
    color: #87969c;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.63rem;
    font-weight: 800;
  }
  .settings-panel dd {
    margin: 5px 0 0;
    color: #1b2b36;
    font-size: 0.82rem;
  }
  .settings-actions {
    display: flex;
    justify-content: flex-end;
  }
  .approve {
    border: 0;
    background: #172a3a;
    color: #fdfcf9;
    border-radius: 5px;
    padding: 11px 14px;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
  }
  .saved,
  .error-msg {
    padding: 11px 14px;
    border-radius: 5px;
    margin-bottom: 18px;
    font-size: 0.78rem;
  }
  .saved {
    background: #e4f3ef;
    color: #167166;
  }
  .error-msg {
    background: #f9e9e7;
    color: #8f413b;
  }
  @media (max-width: 600px) {
    .setting-head {
      display: block;
    }
    .setting-head .status-pill {
      display: inline-block;
      margin-top: 12px;
    }
    .settings-panel dl {
      grid-template-columns: 1fr;
    }
  }
</style>
