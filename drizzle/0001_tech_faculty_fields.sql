ALTER TABLE `users` ADD COLUMN `employee_code` text;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `personal_email` text;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `mobile` text;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `specialization` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_employee_code_unique` ON `users` (`employee_code`);
