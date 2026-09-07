<script lang="ts">
  import { dev } from '$app/environment';
  let { status = 500, message, error } = $props<{ status?: number; message?: string; error?: unknown }>();
  const is404 = $derived(status === 404);
  const detail = $derived(message ?? (error instanceof Error && error.message ? error.message : ''));
  const title = $derived(is404 ? 'Page not found' : `Something went wrong`);
</script>

<svelte:head><title>{status} · Faculty Reporting System</title></svelte:head>
<div class="error-screen">
  <div class="error-card">
    <span class="error-code">{status}</span>
    <h1>{title}</h1>
    <p>{is404 ? 'The page you are looking for does not exist or has been moved.' : 'An unexpected error occurred. Please try again, and contact support if it persists.'}</p>
    {#if detail && dev}
      <pre class="error-detail">{detail}</pre>
    {/if}
    <a class="error-home" href="/dashboard">Go to dashboard</a>
  </div>
</div>

<style>
  .error-screen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: grid;
    place-items: center;
    background: var(--paper);
    padding: 24px;
  }
  .error-card {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 48px 56px;
    max-width: 480px;
    text-align: center;
    box-shadow: var(--shadow-lg);
  }
  .error-code {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--blue-dark);
    background: #eff4fb;
    border: 1px solid var(--blue-border);
    padding: 5px 12px;
    border-radius: 999px;
    margin-bottom: 18px;
  }
  .error-card h1 {
    font-size: 1.55rem;
    letter-spacing: -0.03em;
    color: var(--text-1);
    margin: 0 0 10px;
    font-weight: 750;
  }
  .error-card p {
    font-size: 0.88rem;
    color: var(--text-3);
    margin: 0 0 24px;
    line-height: 1.55;
  }
  .error-detail {
    text-align: left;
    background: var(--navy);
    color: #cbd5e1;
    font-size: 0.72rem;
    padding: 12px;
    border-radius: 7px;
    margin: 0 0 24px;
    overflow: auto;
    max-height: 140px;
  }
  .error-home {
    display: inline-block;
    background: var(--navy);
    border: 1px solid var(--navy);
    color: var(--paper);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 750;
    padding: 11px 22px;
    border-radius: 8px;
    box-shadow: var(--shadow-sm);
    transition: all 0.14s ease;
  }
  .error-home:hover { background: var(--blue-hover); box-shadow: var(--shadow-md); transform: translateY(-1px); }
</style>
