import { z } from 'zod';

export const teachingRecordSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  courseName: z.string().min(1, 'Course name is required'),
  programLevel: z.string().optional().default(''),
  classType: z.string().optional().default('Lecture'),
  scheduled: z.number().min(0).optional().default(0),
  conducted: z.number().min(0).optional().default(0),
  missed: z.number().min(0).optional().default(0),
  missedAction: z.string().optional().nullable().default(null),
  syllabusCompletion: z.number().min(0).max(100).optional().nullable().default(null),
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

export const userCreateSchema = z.object({
  action: z.literal('CREATE'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['FACULTY', 'HOD', 'ADMIN'], { message: 'Role must be FACULTY, HOD, or ADMIN' }),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  departmentId: z.string().optional().nullable().default(null),
});

export const userUpdateSchema = z.object({
  action: z.literal('UPDATE'),
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['FACULTY', 'HOD', 'ADMIN']).optional(),
  departmentId: z.string().optional().nullable(),
  password: z.string().min(4).optional(),
});

export const userToggleSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export const userPostSchema = z.discriminatedUnion('action', [
  userToggleSchema.extend({ action: z.literal(undefined).optional() }).omit({ action: true }).and(z.object({ isActive: z.boolean() })),
  userCreateSchema,
  userUpdateSchema,
]);

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

export const activityRecordsSchema = z.object({
  reportId: z.string().min(1),
  records: z.array(z.record(z.unknown())),
});