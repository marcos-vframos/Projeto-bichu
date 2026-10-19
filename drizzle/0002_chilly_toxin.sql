CREATE TABLE `pilot_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`record_id` text NOT NULL,
	`collection` text NOT NULL,
	`dog_id` text,
	`action` text NOT NULL,
	`before_data` text,
	`after_data` text,
	`changed_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `pilot_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pilot_changes_account_date` ON `pilot_changes` (`account_id`,`changed_at`);--> statement-breakpoint
CREATE TRIGGER pilot_records_audit_create AFTER INSERT ON pilot_records BEGIN
  INSERT INTO pilot_changes (id, account_id, record_id, collection, dog_id, action, before_data, after_data, changed_at)
  VALUES (lower(hex(randomblob(16))), NEW.account_id, NEW.id, NEW.collection, CASE WHEN NEW.collection = 'dogs' THEN NEW.id ELSE NEW.dog_id END, 'create', NULL, NEW.data, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER pilot_records_audit_update AFTER UPDATE ON pilot_records BEGIN
  INSERT INTO pilot_changes (id, account_id, record_id, collection, dog_id, action, before_data, after_data, changed_at)
  VALUES (lower(hex(randomblob(16))), NEW.account_id, NEW.id, NEW.collection, CASE WHEN NEW.collection = 'dogs' THEN NEW.id ELSE NEW.dog_id END, 'update', OLD.data, NEW.data, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER));
END;
--> statement-breakpoint
CREATE TRIGGER pilot_records_audit_delete AFTER DELETE ON pilot_records BEGIN
  INSERT INTO pilot_changes (id, account_id, record_id, collection, dog_id, action, before_data, after_data, changed_at)
  VALUES (lower(hex(randomblob(16))), OLD.account_id, OLD.id, OLD.collection, CASE WHEN OLD.collection = 'dogs' THEN OLD.id ELSE OLD.dog_id END, 'delete', OLD.data, NULL, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER));
END;
