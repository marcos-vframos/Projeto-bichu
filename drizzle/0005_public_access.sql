ALTER TABLE pilot_accounts ADD COLUMN account_kind TEXT NOT NULL DEFAULT 'pilot';
ALTER TABLE pilot_accounts ADD COLUMN legal_version TEXT;
ALTER TABLE pilot_accounts ADD COLUMN legal_accepted_at INTEGER;
CREATE TABLE access_tokens(token_hash TEXT PRIMARY KEY,purpose TEXT NOT NULL,subject TEXT NOT NULL,payload TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX access_tokens_subject ON access_tokens(subject,purpose);
CREATE TABLE access_limits(id TEXT PRIMARY KEY,window_at INTEGER NOT NULL,hits INTEGER NOT NULL);
