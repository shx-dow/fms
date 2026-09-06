<script lang="ts">
  import { reportStatusLabel } from '$lib/domain';

  let { status }: { status: string } = $props();

  const cls = $derived(
    status === 'APPROVED' ? 'pill-ok' : status === 'CHANGES_REQUIRED' ? 'pill-chg' : 'pill-sub',
  );
  // SAFETY: reportStatusLabel covers all known statuses; unknown strings fall back to raw status.
  const label = $derived((reportStatusLabel as Record<string, string>)[status] ?? status);
</script>

<span class={cls}>{label}</span>

<style>
  .pill-ok { background: var(--green-soft); color: var(--green); }
  .pill-chg { background: var(--red-soft); color: var(--red-dark); }
  .pill-sub { background: var(--blue-soft); color: var(--blue-dark); }
</style>
