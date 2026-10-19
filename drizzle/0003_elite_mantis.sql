CREATE TABLE `pilot_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`device_id` text NOT NULL,
	`data` text NOT NULL,
	`active_ms` integer DEFAULT 0 NOT NULL,
	`last_seen` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pilot_device_account` ON `pilot_devices` (`account_id`,`device_id`);--> statement-breakpoint
ALTER TABLE `pilot_events` ADD `device_id` text;--> statement-breakpoint
ALTER TABLE `pilot_events` ADD `details` text;