// Codegen-only: consumed by drizzle-kit (drizzle.config.ts). Runtime queries use raw sql`` in repositories.
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  employeeCode: text('employee_code').unique(),
  personalEmail: text('personal_email'),
  mobile: text('mobile'),
  specialization: text('specialization'),
  profileJson: text('profile_json'),
  role: text('role').notNull(),
  departmentId: text('department_id'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});
export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});
export const periods = sqliteTable('reporting_periods', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  kind: text('kind').notNull(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
  dueOn: text('due_on').notNull(),
  isOpen: integer('is_open', { mode: 'boolean' }).notNull().default(true),
});
export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    facultyId: text('faculty_id').notNull(),
    periodId: text('period_id').notNull(),
    status: text('status').notNull().default('DRAFT'),
    summary: text('summary'),
    challenges: text('challenges'),
    nextGoals: text('next_goals'),
    completion: integer('completion').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    submittedAt: text('submitted_at'),
    reopenedUntil: text('reopened_until'),
    reopenReason: text('reopen_reason'),
    researchEmpty: integer('research_empty').notNull().default(0),
    dutiesEmpty: integer('duties_empty').notNull().default(0),
    outreachEmpty: integer('outreach_empty').notNull().default(0),
  },
  (t) => [
    index('reports_faculty_id_idx').on(t.facultyId),
    index('reports_period_id_idx').on(t.periodId),
    uniqueIndex('reports_faculty_period_uniq').on(t.facultyId, t.periodId),
  ],
);
export const credentials = sqliteTable('credentials', {
  userId: text('user_id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
});
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (t) => [index('sessions_expires_at_idx').on(t.expiresAt)],
);
export const notificationReads = sqliteTable(
  'notification_reads',
  {
    userId: text('user_id').notNull(),
    eventId: text('event_id').notNull(),
    readAt: text('read_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.eventId] })],
);
export const reportExceptions = sqliteTable('report_exceptions', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  actorId: text('actor_id').notNull(),
  reason: text('reason').notNull(),
  allowedUntil: text('allowed_until').notNull(),
  createdAt: text('created_at').notNull(),
});
export const attachments = sqliteTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    ownerId: text('owner_id').notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    storageName: text('storage_name').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('attachments_report_id_idx').on(t.reportId)],
);
export const teaching = sqliteTable(
  'teaching_records',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    courseCode: text('course_code').notNull(),
    courseName: text('course_name').notNull(),
    programLevel: text('program_level').notNull(),
    classType: text('class_type').notNull(),
    scheduled: integer('scheduled').notNull().default(0),
    conducted: integer('conducted').notNull().default(0),
    missed: integer('missed').notNull().default(0),
    missedAction: text('missed_action'),
    syllabusCompletion: real('syllabus_completion'),
    syllabusLecture: integer('syllabus_lecture'),
  },
  (t) => [index('teaching_records_report_id_idx').on(t.reportId)],
);
export const research = sqliteTable(
  'research_records',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    venueOrAgency: text('venue_or_agency'),
    indexingOrQuality: text('indexing_or_quality'),
    role: text('role'),
    status: text('status'),
  },
  (t) => [index('research_records_report_id_idx').on(t.reportId)],
);
export const duties = sqliteTable(
  'institutional_duties',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    activity: text('activity'),
    reach: text('reach'),
    outcome: text('outcome'),
  },
  (t) => [index('institutional_duties_report_id_idx').on(t.reportId)],
);
export const outreach = sqliteTable(
  'outreach_records',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    activity: text('activity').notNull(),
    audience: text('audience'),
    outcome: text('outcome'),
    date: text('date'),
  },
  (t) => [index('outreach_records_report_id_idx').on(t.reportId)],
);
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    reviewerId: text('reviewer_id').notNull(),
    decision: text('decision').notNull(),
    remarks: text('remarks'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('reviews_report_id_idx').on(t.reportId)],
);
export const auditEvents = sqliteTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('audit_events_created_at_idx').on(t.createdAt)],
);
