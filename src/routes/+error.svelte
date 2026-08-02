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
    border-radius: 12px;
    padding: 48px 56px;
    max-width: 460px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  }
  .error-code {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--blue);
    background: var(--bg-hover);
    padding: 4px 10px;
    border-radius: 6px;
    margin-bottom: 18px;
  }
  .error-card h1 {
    font-size: 1.5rem;
    letter-spacing: -0.03em;
    color: var(--navy);
    margin: 0 0 10px;
  }
  .error-card p {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0 0 24px;
    line-height: 1.5;
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
    background: var(--blue);
    color: #fff;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 700;
    padding: 10px 20px;
    border-radius: 7px;
    transition: background 0.14s ease;
  }
  .error-home:hover { background: var(--navy-3); }
</style>
