<script lang="ts">
  import { getToasts, dismissToast } from '$lib/stores/toast.svelte.ts';
  let toasts = $derived(getToasts());
</script>

{#if toasts.length}
  <div class="toast-stack" role="status" aria-live="polite">
    {#each toasts as t (t.id)}
      <div class="toast" class:toast-ok={t.type === 'ok'} class:toast-err={t.type === 'err'} class:leaving={t.leaving}>
        <span class="toast-text">{t.text}</span>
        {#if t.action}
          <button class="toast-act" onclick={() => { t.action!.onClick(); dismissToast(t.id); }}>{t.action.label}</button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-stack {
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 9999;
    display: grid;
    gap: 8px;
    max-width: 360px;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.4;
    box-shadow: 0 3px 12px rgba(23, 37, 45, 0.1);
    animation: toast-in 0.2s ease-out;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .toast-text { flex: 1; min-width: 0; }
  .toast-act { flex: none; border: 0; background: rgba(255, 255, 255, 0.22); color: inherit; font: inherit; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: background 0.1s; }
  .toast-act:hover { background: rgba(255, 255, 255, 0.38); }
  .toast.leaving {
    opacity: 0;
    transform: translateX(30px);
  }
  .toast-ok { background: #7fbf97; color: #1a5a3a; }
  .toast-err { background: #f9e9e7; color: #8f413b; }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
</style>