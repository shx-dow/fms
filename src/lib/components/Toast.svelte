<script lang="ts">
  import { getToasts, dismissToast } from '$lib/stores/toast.svelte.ts';
  let toasts = $derived(getToasts());
</script>

{#if toasts.length}
  <div class="toast-stack" role="status" aria-live="polite">
    {#each toasts as t (t.id)}
      <div class="toast" class:toast-ok={t.type === 'ok'} class:toast-err={t.type === 'err'} class:toast-info={t.type === 'info'} class:leaving={t.leaving}>
        <span class="toast-text">{t.text}</span>
        {#if t.action}
          <button class="toast-act" onclick={() => { t.action!.onClick(); dismissToast(t.id); }}>{t.action.label}</button>
        {/if}
        <button class="toast-x" onclick={() => dismissToast(t.id)} aria-label="Dismiss notification">×</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-stack {
    position: fixed;
    bottom: 18px;
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
    padding: 12px 16px;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.4;
    box-shadow: var(--shadow-md);
    animation: toast-in 0.2s ease-out;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .toast-text { flex: 1; min-width: 0; }
  .toast-act { flex: none; border: 0; background: rgba(255, 255, 255, 0.22); color: inherit; font: inherit; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: background 0.1s; }
  .toast-act:hover { background: rgba(255, 255, 255, 0.38); }
  .toast-x { flex: none; border: 0; background: transparent; color: inherit; opacity: 0.55; font-size: 1rem; font-weight: 700; line-height: 1; padding: 2px 4px; border-radius: 4px; cursor: pointer; transition: opacity 0.1s; }
  .toast-x:hover { opacity: 1; }
  .toast.leaving {
    opacity: 0;
    transform: translateX(30px);
  }
  .toast-ok { background: #f2f9f4; border-color: var(--success-border); color: var(--green); }
  .toast-err { background: var(--red-bg-alt); border-color: var(--red-border); color: var(--red-dark); }
  .toast-info { background: #eff4fb; border-color: var(--blue-border); color: var(--blue-dark); }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
</style>