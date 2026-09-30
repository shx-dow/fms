export type Role = 'FACULTY' | 'HOD' | 'ADMIN';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUIRED';

/** Roles that teach and therefore file a report every week.
 *
 * A department head teaches as well as managing, so an HOD files a report like
 * anyone else. The only role that does not file one is ADMIN, which sits above
 * the HOD (director or dean) and manages the system. */
export const REPORTER_ROLES: readonly Role[] = ['FACULTY', 'HOD'];

/** Roles that review reports.
 *
 * Reviewing is a teaching-side job, so it belongs to the HOD alone. ADMIN looks
 * after the system (periods, accounts, audit) and stays out of the reporting
 * flow, so it neither reviews nor appears in a review queue. An HOD may review
 * any report, including their own. */
export const REVIEWER_ROLES: readonly Role[] = ['HOD'];

export function isReporter(role: Role | string | null | undefined): boolean {
  if (role == null) return false;
  // SAFETY: the argument is a role string, and every entry of REPORTER_ROLES is
  // a Role, so the assertion cannot widen the check beyond a known role.
  return REPORTER_ROLES.includes(role as Role);
}

export function isReviewer(role: Role | string | null | undefined): boolean {
  if (role == null) return false;
  // SAFETY: as above, every entry of REVIEWER_ROLES is a Role.
  return REVIEWER_ROLES.includes(role as Role);
}

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
