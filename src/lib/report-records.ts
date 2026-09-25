export interface ResearchRecord {
  [field: string]: string;
  category: string;
  title: string;
  venueOrAgency: string;
  indexingOrQuality: string;
  role: string;
  status: string;
}

export interface DutyRecord {
  [field: string]: string;
  name: string;
  role: string;
  activity: string;
  reach: string;
  outcome: string;
}

export interface OutreachRecord {
  [field: string]: string;
  activity: string;
  audience: string;
  outcome: string;
  date: string;
}

export type ActivityRecord = ResearchRecord | DutyRecord | OutreachRecord;
export type ActivitySection = 'research' | 'duties' | 'outreach';

export const BLANK_RESEARCH: ResearchRecord = {
  category: 'Journal Paper',
  title: '',
  venueOrAgency: '',
  indexingOrQuality: '',
  role: '',
  status: '',
};

export const BLANK_DUTY: DutyRecord = { name: '', role: '', activity: '', reach: '', outcome: '' };
export const BLANK_OUTREACH: OutreachRecord = { activity: '', audience: '', outcome: '', date: '' };

/** Rows carry an index signature, so the descriptor-driven form can read and write fields by name. */
export function fieldValue(row: ActivityRecord, key: string): string {
  return row[key] ?? '';
}

export function setFieldValue(row: ActivityRecord, key: string, value: string): void {
  row[key] = value;
}
