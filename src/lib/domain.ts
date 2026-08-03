export type Role = 'FACULTY' | 'HOD' | 'ADMIN';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUIRED';
export type PeriodKind = 'WEEKLY';

export interface User {
  id: string;
  name: string;
  email: string;
  employeeCode?: string | null;
  personalEmail?: string | null;
  mobile?: string | null;
  specialization?: string | null;
  role: Role;
  departmentId?: string;
}

export interface ReportingPeriod {
  id: string;
  label: string;
  kind: PeriodKind;
  startsOn: string;
  endsOn: string;
  dueOn: string;
  isOpen: boolean;
}

export interface Report {
  id: string;
  facultyId: string;
  periodId: string;
  status: ReportStatus;
  completion: number;
  updatedAt: string;
}

export interface TeachingRecord {
  courseCode: string;
  courseName: string;
  programLevel: string;
  classType: string;
  scheduled: number;
  conducted: number;
  missed: number;
  missedAction?: string;
  syllabusCompletion?: number;
  syllabusLecture?: number;
}

export interface ResearchRecord {
  category: 'Journal Paper' | 'Patent' | 'Research Grant' | 'Conference / FDP';
  title: string;
  venueOrAgency?: string;
  indexingOrQuality?: string;
  role?: string;
  status?: string;
}

export const reportStatusLabel: Record<ReportStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  CHANGES_REQUIRED: 'Changes required',
};
