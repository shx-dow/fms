CREATE INDEX `attachments_report_id_idx` ON `attachments` (`report_id`);--> statement-breakpoint
CREATE INDEX `audit_events_created_at_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `institutional_duties_report_id_idx` ON `institutional_duties` (`report_id`);--> statement-breakpoint
CREATE INDEX `outreach_records_report_id_idx` ON `outreach_records` (`report_id`);--> statement-breakpoint
CREATE INDEX `reports_faculty_id_idx` ON `reports` (`faculty_id`);--> statement-breakpoint
CREATE INDEX `reports_period_id_idx` ON `reports` (`period_id`);--> statement-breakpoint
CREATE INDEX `research_records_report_id_idx` ON `research_records` (`report_id`);--> statement-breakpoint
CREATE INDEX `reviews_report_id_idx` ON `reviews` (`report_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `teaching_records_report_id_idx` ON `teaching_records` (`report_id`);