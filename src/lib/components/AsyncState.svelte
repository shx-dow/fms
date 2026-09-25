<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    kind = 'loading',
    message,
    action,
  }: {
    kind?: 'loading' | 'error' | 'banner';
    message: string;
    action?: Snippet;
  } = $props();
</script>

{#if kind === 'loading'}
  <div class="state state-loading">
    <span class="spinner"></span>
    {#if message}<span>{message}</span>{/if}
  </div>
{:else if kind === 'error'}
  <div class="state state-error" role="alert">{message}</div>
{:else}
  <div class="state state-banner" role="alert">
    <span>{message}</span>
    {#if action}
      <span class="state-action">{@render action()}</span>
    {/if}
  </div>
{/if}

<style>
  .state { display: flex; align-items: center; gap: 12px; padding: 32px 20px; font-size: 0.88rem; }
  .state-loading { color: var(--muted-3); }
  .state-error { display: block; padding: 16px 20px; background: var(--red-bg); color: var(--red); border-radius: 7px; }
  .state-banner { gap: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 0.8rem; background: var(--red-bg-alt); border: 1px solid var(--red-border); color: var(--red-dark); border-radius: var(--radius-md); box-shadow: var(--shadow-xs); }
  .state-action { margin-left: auto; }
  .state-action :global(a) { color: var(--red-dark); font-weight: 800; text-decoration: none; }
  .state-action :global(a):hover { text-decoration: underline; }
</style>
