export interface DashboardReportData {
  reportId: string;
  periodLabel: string;
  dueOn: string;
  status: string;
  completion: number;
  scheduled: number;
  conducted: number;
  syllabus: number;
  researchCount: number;
  dutiesCount: number;
  outreachCount: number;
  filesCount: number;
  hasTeaching: boolean;
  history: {
    id: string;
    status: string;
    completion: number;
    period_label: string;
    period_id: string;
    updated_at: string;
    submitted_at: string | null;
  }[];
}
