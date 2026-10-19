CREATE TABLE `pilot_login_attempts` (
	`email` text PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`locked_until` integer NOT NULL
);
