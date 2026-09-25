import type { TeachingRecord } from '$lib/domain';

export const STEPS = ['teaching', 'research', 'duties', 'outreach', 'files', 'review'] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABELS = {
  teaching: 'Teaching',
  research: 'Research',
  duties: 'Duties',
  outreach: 'Outreach',
  files: 'Files',
  review: 'Review',
} satisfies Record<Step, string>;

const SENTINEL = 'N/A';

export function validStep(value: string | null): Step | null {
  // SAFETY: STEPS is a fixed readonly tuple; the membership test narrows value to a valid Step.
  if (!(STEPS as readonly string[]).includes(value ?? '')) return null;
  // SAFETY: Returned only after the membership test above confirmed value is a member of STEPS.
  return value as Step;
}

/** Teaching totals and validity, derived once and reused by scoring and notes. */
export interface TeachingSummary {
  scheduled: number;
  conducted: number;
  deliveryRate: number;
  deliveryOk: boolean;
  syllabusLecture: number;
  hasValidTeaching: boolean;
  teachingValid: boolean;
  overIndices: number[];
}

export function summariseTeaching(teaching: TeachingRecord[]): TeachingSummary {
  const scheduled = teaching.reduce((sum, i) => sum + Number(i.scheduled || 0), 0);
  const conducted = teaching.reduce((sum, i) => sum + Number(i.conducted || 0), 0);
  const deliveryRate = scheduled ? Math.round((conducted / scheduled) * 100) : 0;
  const overIndices = teaching
    .map((t, i) =>
      (t.courseCode?.trim() || t.courseName?.trim()) && Number(t.conducted ?? 0) > Number(t.scheduled ?? 0) ? i : -1,
    )
    .filter((i) => i >= 0);
  return {
    scheduled,
    conducted,
    deliveryRate,
    deliveryOk: deliveryRate >= 90,
    syllabusLecture: Math.max(0, ...teaching.map((t) => Number(t.syllabusLecture || 0))),
    hasValidTeaching: teaching.some((i) => i.courseCode?.trim() && i.courseName?.trim()),
    teachingValid: teaching.every((i) => {
      if (!i.courseCode?.trim() && !i.courseName?.trim()) return true;
      return Number(i.conducted ?? 0) <= Number(i.scheduled ?? 0);
    }),
    overIndices,
  };
}

/** Counts rows that hold real content, ignoring blank rows and the N/A sentinel. */
export function countActive<T>(rows: T[], field: (row: T) => string | null | undefined): number {
  return rows.filter((row) => {
    const value = field(row);
    return Boolean(value?.trim()) && value !== SENTINEL;
  }).length;
}

export function isNotApplicable(rows: TitledRow[], field: (row: TitledRow) => string | null | undefined, flagged: boolean): boolean {
  return flagged || rows.some((row) => field(row) === SENTINEL);
}

export interface TitledRow {
  title?: string | null;
  name?: string | null;
  activity?: string | null;
}

export interface ReportProgressInput {
  teaching: TeachingSummary;
  researchActive: number;
  dutiesCount: number;
  outreachCount: number;
  attachmentCount: number;
}

export interface SectionFlags {
  researchNA: boolean;
  dutiesNA: boolean;
  outreachNA: boolean;
}

/** Percentage weights: teaching 30/15/10, research 15, duties 10, delivery 10, all-three bonus 10. */
export function computeCompletion(input: ReportProgressInput): number {
  const { teaching, researchActive, dutiesCount, attachmentCount: _attachmentCount } = input;
  const hasResearch = researchActive > 0;
  const hasDuties = dutiesCount > 0;
  return Math.min(
    100,
    Math.round(
      (teaching.hasValidTeaching ? 30 : 0) +
        (teaching.hasValidTeaching && teaching.scheduled > 0 ? 15 : 0) +
        (teaching.teachingValid ? 10 : 0) +
        (hasResearch ? 15 : 0) +
        (hasDuties ? 10 : 0) +
        (teaching.deliveryOk ? 10 : 0) +
        (teaching.hasValidTeaching && hasResearch && hasDuties ? 10 : 0),
    ),
  );
}

export interface ReviewNote {
  level: 'error' | 'warn';
  text: string;
  step: Step;
}

export function reviewNotes(input: ReportProgressInput & SectionFlags): ReviewNote[] {
  const { teaching, researchActive, dutiesCount, outreachCount, attachmentCount, researchNA, dutiesNA, outreachNA } = input;
  const notes: ReviewNote[] = [];
  for (const i of teaching.overIndices) {
    notes.push({ level: 'error', text: `Course ${i + 1}: conducted classes exceed scheduled — fix the numbers.`, step: 'teaching' });
  }
  if (!teaching.hasValidTeaching) notes.push({ level: 'warn', text: 'No teaching entries yet.', step: 'teaching' });
  if (!researchActive && !researchNA) notes.push({ level: 'warn', text: 'No research records.', step: 'research' });
  if (!dutiesCount && !dutiesNA) notes.push({ level: 'warn', text: 'No institutional duties.', step: 'duties' });
  if (!outreachCount && !outreachNA) notes.push({ level: 'warn', text: 'No outreach activity.', step: 'outreach' });
  if (!attachmentCount) notes.push({ level: 'warn', text: 'No supporting files attached.', step: 'files' });
  return notes;
}

export function stepDone(step: Step, input: ReportProgressInput & SectionFlags): boolean {
  const { teaching, researchActive, dutiesCount, outreachCount, attachmentCount, researchNA, dutiesNA, outreachNA } = input;
  if (step === 'teaching') return teaching.hasValidTeaching;
  if (step === 'research') return researchActive > 0 || researchNA;
  if (step === 'duties') return dutiesCount > 0 || dutiesNA;
  if (step === 'outreach') return outreachCount > 0 || outreachNA;
  if (step === 'files') return attachmentCount > 0;
  return reviewNotes(input).length === 0;
}

export function autoSummary(input: ReportProgressInput & { courseCount: number }): string {
  const { teaching, researchActive, dutiesCount, attachmentCount, courseCount } = input;
  return (
    `This week you conducted ${teaching.conducted} of ${teaching.scheduled} scheduled classes ` +
    `(${teaching.deliveryRate}% delivery rate) across ${courseCount} course(s). ` +
    (researchActive > 0 ? `${researchActive} research record(s) active. ` : '') +
    (dutiesCount > 0 ? `${dutiesCount} institutional dut${dutiesCount === 1 ? 'y' : 'ies'}. ` : '') +
    (attachmentCount > 0 ? `${attachmentCount} file(s) attached.` : '')
  );
}
