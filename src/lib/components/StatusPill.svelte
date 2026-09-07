<script lang="ts">
  import { reportStatusLabel } from '$lib/domain';

  let { status }: { status: string } = $props();

  const cls = $derived(
    status === 'APPROVED'
      ? 'pill pill-approved'
      : status === 'CHANGES_REQUIRED'
        ? 'pill pill-changes'
        : status === 'DRAFT'
          ? 'pill pill-draft'
          : status === 'SUBMITTED'
            ? 'pill pill-submitted'
            : 'pill pill-none',
  );
  // SAFETY: reportStatusLabel covers all known statuses; unknown strings fall back to raw status.
  const label = $derived((reportStatusLabel as Record<string, string>)[status] ?? status);
</script>

<span class={cls}>{label}</span>

<style>
  .pill { display: inline-flex; align-items: center; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.02em; padding: 4px 11px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap; }
  .pill-approved { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .pill-changes { background: var(--red-soft); border-color: var(--red-border); color: var(--red-dark); }
  .pill-draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .pill-submitted { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue-dark); }
  .pill-none { background: var(--line-light); border-color: var(--line); color: var(--gray); }
</style>
