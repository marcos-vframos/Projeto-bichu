CREATE TABLE IF NOT EXISTS temporary_access_links (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('tutor','staff')),
  subject_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  last_used_at INTEGER
);
CREATE INDEX IF NOT EXISTS temporary_access_target ON temporary_access_links(role,subject_id);
CREATE TABLE IF NOT EXISTS temporary_access_sessions (
  role TEXT NOT NULL CHECK(role IN ('tutor','staff')),
  token_hash TEXT NOT NULL,
  link_id TEXT NOT NULL REFERENCES temporary_access_links(id) ON DELETE CASCADE,
  PRIMARY KEY(role,token_hash)
);
