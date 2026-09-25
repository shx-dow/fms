<script lang="ts">
  import { BLANK_DUTY, BLANK_OUTREACH, BLANK_RESEARCH, fieldValue, setFieldValue, type ActivityRecord, type ActivitySection } from '$lib/report-records';

  export interface RecordField {
    key: string;
    label: string;
    placeholder?: string;
    type?: 'text' | 'date';
    options?: string[];
  }

  export interface SectionSpec {
    title: string;
    itemLabel: string;
    addLabel: string;
    saveLabel: string;
    naNote: string;
    emptyHint: string;
    blank: ActivityRecord;
    fields: RecordField[];
  }

  const SECTIONS = {
    research: {
      title: 'Research & publications',
      itemLabel: 'Record',
      addLabel: '+ Add record',
      saveLabel: 'Save research',
      naNote: 'No research activity this week.',
      emptyHint: 'No research records yet. Add papers, patents, grants, or conferences you worked on this week.',
      blank: BLANK_RESEARCH,
      fields: [
        { key: 'category', label: 'Category', options: ['Journal Paper', 'Patent', 'Research Grant', 'Conference / FDP'] },
        { key: 'title', label: 'Title', placeholder: 'Title of paper, patent or project' },
        { key: 'venueOrAgency', label: 'Venue / agency', placeholder: 'Journal name, conference, or funding body' },
        { key: 'indexingOrQuality', label: 'Indexing / quality', placeholder: 'SCI, Scopus, UGC, etc.' },
        { key: 'role', label: 'Role', placeholder: 'Lead author, Co-author, PI' },
        { key: 'status', label: 'Status', placeholder: 'In progress, submitted, published' },
      ],
    },
    duties: {
      title: 'Institutional duties',
      itemLabel: 'Duty',
      addLabel: '+ Add duty',
      saveLabel: 'Save duties',
      naNote: 'No institutional duties this week.',
      emptyHint: 'No institutional duties yet. Add committees, events, or responsibilities you took on this week.',
      blank: BLANK_DUTY,
      fields: [
        { key: 'name', label: 'Committee / body', placeholder: 'e.g. Exam Cell, NAAC, IQAC' },
        { key: 'role', label: 'Role', placeholder: 'e.g. Member, Convenor, Coordinator' },
        { key: 'activity', label: 'Activity', placeholder: 'e.g. Invigilation, event coordination' },
        { key: 'reach', label: 'Reach / scope', placeholder: 'Institute-wide, department, etc.' },
        { key: 'outcome', label: 'Outcome', placeholder: 'e.g. Completed, report submitted' },
      ],
    },
    outreach: {
      title: 'Outreach activity',
      itemLabel: 'Outreach',
      addLabel: '+ Add outreach',
      saveLabel: 'Save outreach',
      naNote: 'No outreach activity this week.',
      emptyHint: 'No outreach activity yet. Add visits, drives, or events you were part on this week.',
      blank: BLANK_OUTREACH,
      fields: [
        { key: 'activity', label: 'Activity', placeholder: 'e.g. School visit, counselling drive' },
        { key: 'audience', label: 'Audience', placeholder: 'e.g. Students, parents, industry' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'outcome', label: 'Outcome', placeholder: 'e.g. Registrations, queries resolved' },
      ],
    },
  } satisfies Record<ActivitySection, SectionSpec>;

  let {
    section,
    records = $bindable(),
    notApplicable,
    saving,
    ontoggleNA,
    onadd,
    onremove,
    onchange,
    onsave,
  }: {
    section: ActivitySection;
    records: ActivityRecord[];
    notApplicable: boolean;
    saving: boolean;
    ontoggleNA: () => void;
    onadd: () => void;
    onremove: (index: number) => void;
    onchange: () => void;
    onsave: () => void;
  } = $props();

  const spec: SectionSpec = $derived(SECTIONS[section]);
  const primaryKey = $derived(spec.fields[0].key);
  const visible = $derived(records.filter((row) => fieldValue(row, primaryKey) !== 'N/A'));

  export function blankRecord(): ActivityRecord {
    return { ...spec.blank };
  }
</script>

<div class="section-top">
  <h2>{spec.title}</h2>
  <button class="na-toggle" class:active={notApplicable} onclick={ontoggleNA}>{notApplicable ? 'Undo' : 'Nothing this week'}</button>
</div>
{#if notApplicable}<p class="na-note">{spec.naNote}</p>{/if}
{#each visible as item, i (i)}
  <div class="record-card">
    <div class="course-head">
      <strong>{spec.itemLabel} {i + 1}</strong>
      {#if records.length > 1}
        <button class="act-remove" onclick={() => onremove(i)}>Remove</button>
      {/if}
    </div>
    <div class="field-grid">
      {#each spec.fields as field (field.key)}
        <label>
          {field.label}
          {#if field.options}
            <select
              value={fieldValue(item, field.key)}
              onchange={(e) => {
                setFieldValue(item, field.key, e.currentTarget.value);
                onchange();
              }}
            >
              {#each field.options as option (option)}<option value={option}>{option}</option>{/each}
            </select>
          {:else}
            <input
              type={field.type ?? 'text'}
              value={fieldValue(item, field.key)}
              placeholder={field.placeholder ?? ''}
              oninput={(e) => {
                setFieldValue(item, field.key, e.currentTarget.value);
                onchange();
              }}
            />
          {/if}
        </label>
      {/each}
    </div>
  </div>
{:else}
  <p class="empty-hint">{spec.emptyHint}</p>
{/each}
<div class="record-acts">
  {#if !notApplicable}<button class="act-add" onclick={onadd}>{spec.addLabel}</button>{/if}
  <button class="btn" onclick={onsave}>{saving ? 'Saving…' : spec.saveLabel}</button>
</div>

<style>
  .section-top { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-top h2 { font-size: 1.18rem; margin: 0; letter-spacing: -0.02em; font-weight: 750; color: var(--text-1); }
  .na-toggle { margin-left: auto; border: 1px solid var(--line); background: var(--panel); border-radius: 999px; padding: 5px 12px; font: inherit; font-size: 0.72rem; font-weight: 750; color: var(--muted); cursor: pointer; }
  .na-toggle.active { background: var(--draft-bg); border-color: var(--draft-border); color: var(--warn-dark); }
  .na-note { margin: 0 0 16px; font-size: 0.8rem; color: var(--muted-2); }
  .empty-hint { color: var(--muted-2); font-size: 0.82rem; margin: 0 0 16px; }
  .record-card { border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--panel); padding: 16px 18px; margin-bottom: 12px; box-shadow: var(--shadow-xs); }
  .course-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line-2); }
  .course-head strong { font-size: 0.84rem; color: var(--blue-dark); font-weight: 800; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .record-card label { display: block; color: var(--text-3); font-size: 0.74rem; font-weight: 700; }
  .record-card input, .record-card select { display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1); font: inherit; font-size: 0.86rem; box-shadow: var(--shadow-xs); }
  .record-card input:focus, .record-card select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .record-card input::placeholder { color: var(--muted-3); }
  .record-acts { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
  .act-add { border: 1px dashed var(--blue-border); background: #f4f8fd; color: var(--blue-dark); border-radius: var(--radius-md); padding: 11px; font: inherit; font-size: 0.8rem; font-weight: 750; cursor: pointer; }
  .act-add:hover { background: #e9f1fb; }
  .act-remove { border: 1px solid transparent; background: transparent; color: var(--red); font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; padding: 3px 8px; border-radius: 6px; }
  .act-remove:hover { background: var(--red-bg-alt); border-color: var(--red-border); }
  @media (max-width: 700px) { .field-grid { grid-template-columns: 1fr; } }
</style>
