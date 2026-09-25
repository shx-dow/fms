<script lang="ts">
  import type { TeachingRecord } from '$lib/domain';

  let {
    teaching = $bindable(),
    deliveryRate,
    hasValidTeaching,
    isReadonly,
    hasTemplate,
    prevReportLabel,
    onchange,
    onadd,
    onremove,
    onloadtemplate,
    oncopy,
  }: {
    teaching: TeachingRecord[];
    deliveryRate: number;
    hasValidTeaching: boolean;
    isReadonly: boolean;
    hasTemplate: boolean;
    prevReportLabel: string;
    onchange: () => void;
    onadd: () => void;
    onremove: (index: number) => void;
    onloadtemplate: () => void;
    oncopy: () => void;
  } = $props();
</script>

<div class="section-top">
  <h2>Teaching & academic delivery</h2>
  <span class="metric-badge">{deliveryRate}% delivery</span>
</div>
<p class="section-hint">Course details and scheduled classes come from your recurring profile. Update the weekly delivery values below.</p>
{#if !hasValidTeaching && !isReadonly}
  <div class="start-helper">
    <div>
      <strong>Starting from a blank week?</strong>
      <p>Pre-fill everything, then just update the numbers.</p>
    </div>
    <div class="start-acts">
      {#if hasTemplate}<button class="btn" onclick={onloadtemplate}>Load my template</button>{/if}
      {#if prevReportLabel}<button class="btn" onclick={oncopy}>Copy from {prevReportLabel}</button>{/if}
    </div>
  </div>
{/if}
<div class="course-list">
  {#each teaching as item, i (i)}
    <div class="course-card">
      <div class="course-head">
        <strong>Course {i + 1}</strong>
        {#if teaching.length > 1}
          <button class="act-remove" onclick={() => onremove(i)}>Remove</button>
        {/if}
      </div>
      <div class="field-grid">
        <label>Course code<input bind:value={item.courseCode} oninput={onchange} placeholder="CSE-301" /></label>
        <label>Course name<input bind:value={item.courseName} oninput={onchange} placeholder="Database Management Systems" /></label>
        <label>Program / level<input bind:value={item.programLevel} oninput={onchange} placeholder="B.Tech · III Year" /></label>
        <label>Class type<select bind:value={item.classType} onchange={onchange}><option>Lecture</option><option>Lab</option><option>Tutorial</option><option>Seminar</option></select></label>
      </div>
      <div class="number-grid">
        <label>Scheduled<input type="number" min="0" bind:value={item.scheduled} oninput={onchange} placeholder="0" /></label>
        <label>Conducted this week<input type="number" min="0" bind:value={item.conducted} oninput={onchange} placeholder="0" /></label>
        <label>Missed this week<input type="number" min="0" bind:value={item.missed} oninput={onchange} placeholder="0" /></label>
        <label>Syllabus covered up to lecture no.<input type="number" min="0" bind:value={item.syllabusLecture} oninput={onchange} placeholder="e.g. 18" /></label>
      </div>
      <label class="missed-label">Weekly action for missed classes<input bind:value={item.missedAction} oninput={onchange} placeholder="e.g. Makeup class scheduled" /></label>
    </div>
  {/each}
  <button class="act-add" onclick={onadd}>+ Add course</button>
</div>

<style>
  .section-top { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-top h2 { font-size: 1.18rem; margin: 0; letter-spacing: -0.02em; font-weight: 750; color: var(--text-1); }
  .metric-badge { margin-left: auto; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; background: var(--blue-soft); color: var(--blue-dark); }
  .section-hint { margin: -10px 0 18px; color: var(--muted-2); font-size: 0.82rem; line-height: 1.5; }
  .start-helper { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 16px 18px; margin-bottom: 18px; border-radius: var(--radius-md); border: 1px dashed var(--blue-border); background: #f4f8fd; }
  .start-helper strong { display: block; font-size: 0.84rem; color: var(--text-1); margin-bottom: 3px; }
  .start-helper p { margin: 0; font-size: 0.78rem; color: var(--muted-2); }
  .start-acts { display: flex; gap: 8px; flex-wrap: wrap; }
  .course-list { display: grid; gap: 14px; }
  .course-card { border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--panel); padding: 16px 18px; box-shadow: var(--shadow-xs); }
  .course-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line-2); }
  .course-head strong { font-size: 0.84rem; color: var(--blue-dark); font-weight: 800; letter-spacing: 0.01em; }
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .number-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
  .course-card label { display: block; color: var(--text-3); font-size: 0.74rem; font-weight: 700; letter-spacing: 0.005em; }
  .course-card input, .course-card select { display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg-input); color: var(--text-1); font: inherit; font-size: 0.86rem; box-shadow: var(--shadow-xs); transition: border-color 0.13s ease, box-shadow 0.13s ease; }
  .course-card input:focus, .course-card select:focus { outline: none; border-color: var(--accent); box-shadow: var(--focus-ring); }
  .course-card input::placeholder { color: var(--muted-3); }
  .missed-label { display: block; color: var(--muted); font-size: 0.72rem; font-weight: 700; }
  .act-add { border: 1px dashed var(--blue-border); background: #f4f8fd; color: var(--blue-dark); border-radius: var(--radius-md); padding: 11px; font: inherit; font-size: 0.8rem; font-weight: 750; cursor: pointer; transition: background 0.12s ease; }
  .act-add:hover { background: #e9f1fb; }
  .act-remove { border: 1px solid transparent; background: transparent; color: var(--red); font: inherit; font-size: 0.72rem; font-weight: 700; cursor: pointer; padding: 3px 8px; border-radius: 6px; }
  .act-remove:hover { background: var(--red-bg-alt); border-color: var(--red-border); }
</style>
