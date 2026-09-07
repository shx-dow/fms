<script lang="ts">
  export type PreviewRow = { title: string; sub?: string | null; meta?: string | null };

  let {
    kicker,
    teaching = [],
    research = [],
    duties = [],
    outreach = [],
    summary = '',
  }: {
    kicker: string;
    teaching?: PreviewRow[];
    research?: PreviewRow[];
    duties?: PreviewRow[];
    outreach?: PreviewRow[];
    summary?: string;
  } = $props();
</script>

<div class="preview-paper">
  <div class="preview-kicker">{kicker}</div>
  <h2>Teaching & academic delivery</h2>
  {#each teaching as item}
    <div class="preview-row">
      <strong>{item.title || 'Untitled'}</strong>
      <span>{item.sub || '—'}</span>
      <span class="preview-stat">{item.meta || '—'}</span>
    </div>
  {:else}
    <p class="empty">No teaching records.</p>
  {/each}
  <h2>Research & publications</h2>
  {#each research as item}
    <div class="preview-row">
      <strong>{item.title || 'Untitled'}</strong>
      <span>{item.sub || '—'}</span>
      <span class="preview-stat">{item.meta || '—'}</span>
    </div>
  {:else}
    <p class="empty">No research records.</p>
  {/each}
  <h2>Institutional duties</h2>
  {#each duties as item}
    <div class="preview-row">
      <strong>{item.title || 'Untitled'}</strong>
      <span>{item.sub || '—'}</span>
      <span class="preview-stat">{item.meta || '—'}</span>
    </div>
  {:else}
    <p class="empty">No duties recorded.</p>
  {/each}
  <h2>Outreach & admissions</h2>
  {#each outreach as item}
    <div class="preview-row">
      <strong>{item.title || 'Untitled'}</strong>
      <span>{item.sub || '—'}</span>
      <span class="preview-stat">{item.meta || '—'}</span>
    </div>
  {:else}
    <p class="empty">No outreach recorded.</p>
  {/each}
  <h2>Weekly summary</h2>
  {#if summary?.trim()}
    <div class="preview-text">{summary}</div>
  {:else}
    <p class="empty">No weekly summary entered.</p>
  {/if}
</div>

<style>
  .preview-paper {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 34px 36px;
    box-shadow: var(--shadow-sm);
  }
  .preview-kicker {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--line-2);
  }
  .preview-paper h2 {
    font-size: 1.02rem;
    margin: 22px 0 10px;
    letter-spacing: -0.01em;
    font-weight: 750;
    color: var(--text-1);
  }
  .preview-paper h2:first-of-type {
    margin-top: 0;
  }
  .preview-row {
    display: grid;
    grid-template-columns: 150px 1fr auto;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line-2);
    font-size: 0.84rem;
    align-items: center;
  }
  .preview-row strong {
    color: var(--text-1);
    font-weight: 750;
  }
  .preview-stat {
    color: var(--text-3);
  }
  .preview-text {
    background: var(--paper);
    border-radius: 6px;
    padding: 14px;
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--ink-2);
    white-space: pre-wrap;
  }
  .empty {
    color: var(--muted-2);
    font-size: 0.84rem;
    padding: 10px 0;
  }
</style>
