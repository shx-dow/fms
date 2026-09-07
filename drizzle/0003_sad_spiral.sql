DELETE FROM `reports` AS r WHERE r.`status` = 'DRAFT' AND EXISTS (SELECT 1 FROM `reports` AS o WHERE o.`faculty_id` = r.`faculty_id` AND o.`period_id` = r.`period_id` AND (o.`created_at` < r.`created_at` OR (o.`created_at` = r.`created_at` AND o.`id` < r.`id`)));--> statement-breakpoint
ALTER TABLE `reports` ADD `research_empty` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `duties_empty` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reports` ADD `outreach_empty` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `reports_faculty_period_uniq` ON `reports` (`faculty_id`,`period_id`);