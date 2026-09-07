export type Role = 'FACULTY' | 'HOD' | 'ADMIN';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUIRED';

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
  mustChangePassword?: boolean;
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

export const reportStatusLabel = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  CHANGES_REQUIRED: 'Changes required',
} satisfies Record<ReportStatus, string>;
