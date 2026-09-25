<script lang="ts">
  export interface EvidenceFile {
    id: string;
    filename: string;
    size: number;
    created_at: string;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function safeName(name: string): string {
    return name.split(/[\\/]/).pop() ?? name;
  }

  let {
    attachments,
    canEdit,
    onupload,
    ondelete,
  }: {
    attachments: EvidenceFile[];
    canEdit: boolean;
    onupload: (event: Event) => void;
    ondelete: (id: string) => void;
  } = $props();
</script>

<div class="section-top"><h2>Supporting files</h2></div>
<p class="section-hint">Attach timetables, event photos, certificates, or any evidence for this week.</p>
<div class="attach-list">
  {#each attachments as a (a.id)}
    <div class="attach-row">
      <div class="attach-info">
        <strong>{safeName(a.filename)}</strong>
        <small>{formatSize(a.size)} · {new Date(a.created_at).toLocaleDateString()}</small>
      </div>
      <div class="attach-acts">
        <a href="/api/attachments/{a.id}" download>Download</a>
        {#if canEdit}<button class="act-remove" onclick={() => ondelete(a.id)}>Delete</button>{/if}
      </div>
    </div>
  {:else}
    <p class="empty">No files uploaded yet.</p>
  {/each}
</div>
{#if canEdit}
  <label class="upload-btn">+ Upload file<input disabled={!canEdit} type="file" accept="application/pdf,image/png,image/jpeg" onchange={onupload} /></label>
{/if}

<style>
  .section-top { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-top h2 { font-size: 1.18rem; margin: 0; letter-spacing: -0.02em; font-weight: 750; color: var(--text-1); }
  .section-hint { margin: -10px 0 18px; color: var(--muted-2); font-size: 0.82rem; line-height: 1.5; }
  .attach-list { display: grid; gap: 10px; margin-bottom: 16px; }
  .attach-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--panel); box-shadow: var(--shadow-xs); }
  .attach-info { flex: 1; min-width: 0; }
  .attach-info strong { display: block; font-size: 0.84rem; color: var(--text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .attach-info small { display: block; font-size: 0.72rem; color: var(--muted-2); margin-top: 2px; }
  .attach-acts { display: flex; align-items: center; gap: 8px; flex: none; }
  .attach-acts a { font-size: 0.76rem; font-weight: 700; color: var(--blue); text-decoration: none; }
  .attach-acts a:hover { text-decoration: underline; }
  .act-remove { border: 1px solid transparent; background: transparent; color: var(--red); font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; padding: 3px 8px; border-radius: 6px; }
  .act-remove:hover { background: var(--red-bg-alt); border-color: var(--red-border); }
  .upload-btn { display: inline-flex; align-items: center; gap: 8px; border: 1px dashed var(--blue-border); background: #f4f8fd; color: var(--blue-dark); border-radius: var(--radius-md); padding: 11px 16px; font-size: 0.8rem; font-weight: 750; cursor: pointer; }
  .upload-btn input { display: none; }
  .empty { color: var(--muted-2); font-size: 0.82rem; margin: 0; }
</style>
