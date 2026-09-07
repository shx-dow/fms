import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const passwordTooShortMessage = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

const blankAsZero = (schema: z.ZodNumber) => z.preprocess((value) => value === '' || value === null || value === undefined ? 0 : value, schema);
const blankAsNull = (schema: z.ZodNumber) => z.preprocess((value) => value === '' || value === undefined ? null : value, schema.nullable());

export const teachingRecordSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  courseName: z.string().min(1, 'Course name is required'),
  programLevel: z.string().optional().default(''),
  classType: z.string().optional().default('Lecture'),
  scheduled: blankAsZero(z.number().min(0)),
  conducted: blankAsZero(z.number().min(0)),
  missed: blankAsZero(z.number().min(0)),
  missedAction: z.string().optional().nullable().default(null),
  syllabusCompletion: blankAsNull(z.number().min(0).max(100)),
  syllabusLecture: blankAsNull(z.number().int().min(0)),
});

export const reportSaveSchema = z.object({
  reportId: z.string().optional(),
  summary: z.string().optional().nullable().default(null),
  challenges: z.string().optional().nullable().default(null),
  nextGoals: z.string().optional().nullable().default(null),
  completion: z.number().min(0).max(100).optional().default(0),
  status: z.enum(['DRAFT', 'SUBMITTED']).optional().default('DRAFT'),
  teaching: z.array(teachingRecordSchema).optional().default([]),
});

export const reviewSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  decision: z.enum(['APPROVED', 'CHANGES_REQUIRED'], { message: 'Decision must be APPROVED or CHANGES_REQUIRED' }),
  remarks: z.string().optional().nullable().default(null),
});

export const departmentSchema = z.object({
  id: z.string().min(1, 'Department ID is required'),
  code: z.string().min(1, 'Department code is required'),
  name: z.string().min(1, 'Department name is required'),
});

export const periodSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional().default(''),
  startsOn: z.string().min(1),
  endsOn: z.string().min(1),
  dueOn: z.string().min(1),
  isOpen: z.boolean(),
});

export const reopenSchema = z.object({
  reportId: z.string().min(1),
  reason: z.string().min(1, 'Reason for reopening is required'),
  allowedUntil: z.string().min(1, 'Expiry date is required'),
});

export const researchRecordSchema = z.object({
  category: z.enum(['Journal Paper', 'Patent', 'Research Grant', 'Conference / FDP']),
  title: z.string().optional().default(''),
  venueOrAgency: z.string().optional().nullable().default(null),
  indexingOrQuality: z.string().optional().nullable().default(null),
  role: z.string().optional().nullable().default(null),
  status: z.string().optional().nullable().default(null),
});

export const dutyRecordSchema = z.object({
  name: z.string().optional().default(''),
  role: z.string().optional().default(''),
  activity: z.string().optional().nullable().default(null),
  reach: z.string().optional().nullable().default(null),
  outcome: z.string().optional().nullable().default(null),
});

export const outreachRecordSchema = z.object({
  activity: z.string().optional().default(''),
  audience: z.string().optional().nullable().default(null),
  outcome: z.string().optional().nullable().default(null),
  date: z.string().optional().nullable().default(null),
});

export const reportRecordsSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  records: z.array(z.unknown()).default([]),
  empty: z.coerce.boolean().optional(),
});

export const notificationUpdateSchema = z.object({
  eventId: z.string().optional(),
  unread: z.coerce.boolean().optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH, passwordTooShortMessage),
});

const roleSchema = z.enum(['FACULTY', 'HOD', 'ADMIN']);

export const setActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export const createUserSchema = z.object({
  action: z.literal('CREATE'),
  name: z.string().min(1),
  email: z.string().min(1),
  role: roleSchema,
  password: z.string().min(1),
  employeeCode: z.string().optional(),
  personalEmail: z.string().optional(),
  mobile: z.string().optional(),
  specialization: z.string().optional(),
  departmentId: z.string().optional(),
});

export const updateUserSchema = z.object({
  action: z.literal('UPDATE'),
  userId: z.string().min(1),
  name: z.string().optional(),
  email: z.string().optional(),
  employeeCode: z.string().nullable().optional(),
  personalEmail: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  specialization: z.string().nullable().optional(),
  role: roleSchema.optional(),
  departmentId: z.string().nullable().optional(),
  password: z.string().optional(),
});
