<script lang="ts">
  import { reportStatusLabel } from '$lib/domain';

  let { status, detail }: { status: string; detail?: string } = $props();

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

<span class={cls}>{label}{detail ? ` · ${detail}` : ''}</span>

<style>
  /* The shared .pill rules live in layout.css. They are declared here only to
     add the status modifier, and they match layout.css exactly: the earlier
     --red-soft background here gave 4.4:1, below AA, and --gray on the neutral
     chip gave 4.2:1. */
  .pill-approved { background: var(--success-bg); border-color: var(--success-border); color: var(--green); }
  .pill-changes { background: var(--red-bg); border-color: var(--red-border); color: var(--red-dark); }
  .pill-draft { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .pill-submitted { background: var(--info-bg); border-color: var(--blue-border); color: var(--blue-dark); }
  .pill-none { background: var(--line-light); border-color: var(--line-2); color: var(--muted-2); }
</style>
