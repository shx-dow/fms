<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, sub, actions }: { title: string; sub?: string; actions?: Snippet } = $props();
</script>

<header class="page-header">
  <div>
    <h1>{title}</h1>
    {#if sub}<span class="page-sub">{sub}</span>{/if}
  </div>
  {#if actions}
    <div class="page-header-actions">{@render actions()}</div>
  {/if}
</header>

<style>
  .page-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 22px 24px; box-shadow: var(--shadow-sm); }
  .page-header h1 { font-size: 1.55rem; letter-spacing: -0.03em; margin: 0 0 4px; font-weight: 750; color: var(--text-1); }
  .page-sub { font-size: 0.84rem; color: var(--text-3); }
  .page-header-actions { display: flex; align-items: center; gap: 14px; }
  @media (max-width: 800px) { .page-header { flex-direction: column; align-items: start; } }
</style>
