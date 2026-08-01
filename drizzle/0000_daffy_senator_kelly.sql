CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`storage_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_code_unique` ON `departments` (`code`);--> statement-breakpoint
CREATE TABLE `institutional_duties` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`activity` text,
	`reach` text,
	`outcome` text
);
--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`read_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`)
);
--> statement-breakpoint
CREATE TABLE `outreach_records` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`activity` text NOT NULL,
	`audience` text,
	`outcome` text,
	`date` text
);
--> statement-breakpoint
CREATE TABLE `reporting_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`due_on` text NOT NULL,
	`is_open` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`reason` text NOT NULL,
	`allowed_until` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`faculty_id` text NOT NULL,
	`period_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`summary` text,
	`challenges` text,
	`next_goals` text,
	`completion` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`submitted_at` text,
	`reopened_until` text,
	`reopen_reason` text
);
--> statement-breakpoint
CREATE TABLE `research_records` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`venue_or_agency` text,
	`indexing_or_quality` text,
	`role` text,
	`status` text
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`decision` text NOT NULL,
	`remarks` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teaching_records` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`course_code` text NOT NULL,
	`course_name` text NOT NULL,
	`program_level` text NOT NULL,
	`class_type` text NOT NULL,
	`scheduled` integer DEFAULT 0 NOT NULL,
	`conducted` integer DEFAULT 0 NOT NULL,
	`missed` integer DEFAULT 0 NOT NULL,
	`missed_action` text,
	`syllabus_completion` real
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`department_id` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);