<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    size = 'md',
    onclose,
    children,
  }: {
    title: string;
    size?: 'sm' | 'md' | 'lg';
    onclose: () => void;
    children: Snippet;
  } = $props();

  const uid = $props.id();
  const titleId = `modal-title-${uid}`;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let dialog = $state<HTMLElement | null>(null);

  // Owns focus for the whole dialog: first control on open, trapped Tab, and
  // focus returned to whatever opened it.
  $effect(() => {
    const el = dialog;
    if (!el) return;
    const previous = document.activeElement;
    const target = el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
    target.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onclose();
      return;
    }
    if (e.key !== 'Tab' || !dialog) return;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<div class="modal-overlay" role="presentation" onclick={onclose}>
  <div
    bind:this={dialog}
    class="modal-box modal-{size}"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={onKeydown}
  >
    <h3 id={titleId}>{title}</h3>
    {@render children()}
  </div>
</div>

<style>
  .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(2px); display: grid; place-items: center; z-index: 200; }
  .modal-box { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 28px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
  .modal-sm { max-width: 400px; }
  .modal-md { max-width: 460px; }
  .modal-lg { max-width: 820px; }
  .modal-box h3 { margin: 0 0 4px; font-size: 1.1rem; color: var(--ink-2); }
</style>
