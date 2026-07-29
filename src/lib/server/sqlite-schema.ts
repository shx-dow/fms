import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
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
export const reports = sqliteTable('reports', {
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
});
export const teaching = sqliteTable('teaching_records', {
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
});
export const research = sqliteTable('research_records', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  venueOrAgency: text('venue_or_agency'),
  indexingOrQuality: text('indexing_or_quality'),
  role: text('role'),
  status: text('status'),
});
export const duties = sqliteTable('institutional_duties', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  activity: text('activity'),
  reach: text('reach'),
  outcome: text('outcome'),
});
export const outreach = sqliteTable('outreach_records', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  activity: text('activity').notNull(),
  audience: text('audience'),
  outcome: text('outcome'),
  date: text('date'),
});
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  reviewerId: text('reviewer_id').notNull(),
  decision: text('decision').notNull(),
  remarks: text('remarks'),
  createdAt: text('created_at').notNull(),
});
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: text('created_at').notNull(),
});
