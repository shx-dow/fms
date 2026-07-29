import { pgEnum, pgTable, text, timestamp, integer, boolean, numeric, uuid } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['FACULTY', 'HOD', 'ADMIN']);
export const periodKindEnum = pgEnum('period_kind', ['WEEKLY', 'MONTHLY']);
export const reportStatusEnum = pgEnum('report_status', ['DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUIRED']);

export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: roleEnum('role').notNull().default('FACULTY'),
  departmentId: uuid('department_id').references(() => departments.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const reportingPeriods = pgTable('reporting_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: text('label').notNull(),
  kind: periodKindEnum('kind').notNull(),
  startsOn: timestamp('starts_on', { mode: 'date' }).notNull(),
  endsOn: timestamp('ends_on', { mode: 'date' }).notNull(),
  dueOn: timestamp('due_on', { mode: 'date' }).notNull(),
  isOpen: boolean('is_open').notNull().default(true),
});

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  facultyId: uuid('faculty_id')
    .references(() => users.id)
    .notNull(),
  periodId: uuid('period_id')
    .references(() => reportingPeriods.id)
    .notNull(),
  status: reportStatusEnum('status').notNull().default('DRAFT'),
  summary: text('summary'),
  challenges: text('challenges'),
  nextGoals: text('next_goals'),
  completion: integer('completion').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const teachingRecords = pgTable('teaching_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id')
    .references(() => reports.id)
    .notNull(),
  courseCode: text('course_code').notNull(),
  courseName: text('course_name').notNull(),
  programLevel: text('program_level').notNull(),
  classType: text('class_type').notNull(),
  scheduled: integer('scheduled').notNull().default(0),
  conducted: integer('conducted').notNull().default(0),
  missed: integer('missed').notNull().default(0),
  missedAction: text('missed_action'),
  syllabusCompletion: numeric('syllabus_completion', {
    precision: 5,
    scale: 2,
  }),
});

export const researchRecords = pgTable('research_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id')
    .references(() => reports.id)
    .notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  venueOrAgency: text('venue_or_agency'),
  indexingOrQuality: text('indexing_or_quality'),
  role: text('role'),
  status: text('status'),
});
