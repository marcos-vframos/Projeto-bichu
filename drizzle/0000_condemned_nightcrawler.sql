CREATE TABLE `pilot_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`first_access_at` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pilot_accounts_email` ON `pilot_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `pilot_events` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`event` text NOT NULL,
	`duration_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pilot_events_account_date` ON `pilot_events` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `pilot_files` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`record_id` text NOT NULL,
	`collection` text NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pilot_files_record_name` ON `pilot_files` (`record_id`,`filename`);--> statement-breakpoint
CREATE TABLE `pilot_records` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`collection` text NOT NULL,
	`dog_id` text,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pilot_records_account_collection` ON `pilot_records` (`account_id`,`collection`);--> statement-breakpoint
CREATE INDEX `idx_pilot_records_dog` ON `pilot_records` (`account_id`,`dog_id`);--> statement-breakpoint
CREATE TABLE `pilot_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pilot_sessions_account` ON `pilot_sessions` (`account_id`);