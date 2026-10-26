ALTER TABLE pilot_changes ADD COLUMN actor_type TEXT NOT NULL DEFAULT 'unknown';
CREATE TABLE pilot_change_context(id INTEGER PRIMARY KEY CHECK(id=1),actor_type TEXT NOT NULL);
INSERT INTO pilot_change_context VALUES(1,'unknown');
DROP TRIGGER pilot_records_audit_create;
DROP TRIGGER pilot_records_audit_update;
DROP TRIGGER pilot_records_audit_delete;
CREATE TRIGGER pilot_records_audit_create AFTER INSERT ON pilot_records BEGIN
  INSERT INTO pilot_changes (id, account_id, record_id, collection, dog_id, action, before_data, after_data, changed_at, actor_type)
  VALUES (lower(hex(randomblob(16))), NEW.account_id, NEW.id, NEW.collection, CASE WHEN NEW.collection = 'dogs' THEN NEW.id ELSE NEW.dog_id END, 'create', NULL, NEW.data, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER), (SELECT actor_type FROM pilot_change_context WHERE id=1));
END;
--> statement-breakpoint
CREATE TRIGGER pilot_records_audit_update AFTER UPDATE ON pilot_records BEGIN
  INSERT INTO pilot_changes (id, account_id, record_id, collection, dog_id, action, before_data, after_data, changed_at, actor_type)
  VALUES (lower(hex(randomblob(16))), NEW.account_id, NEW.id, NEW.collection, CASE WHEN NEW.collection = 'dogs' THEN NEW.id ELSE NEW.dog_id END, 'update', OLD.data, NEW.data, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER), (SELECT actor_type FROM pilot_change_context WHERE id=1));
END;
--> statement-breakpoint
CREATE TRIGGER pilot_records_audit_delete AFTER DELETE ON pilot_records BEGIN
  INSERT INTO pilot_changes (id, account_id, record_id, collection, dog_id, action, before_data, after_data, changed_at, actor_type)
  VALUES (lower(hex(randomblob(16))), OLD.account_id, OLD.id, OLD.collection, CASE WHEN OLD.collection = 'dogs' THEN OLD.id ELSE OLD.dog_id END, 'delete', OLD.data, NULL, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER), (SELECT actor_type FROM pilot_change_context WHERE id=1));
END;
