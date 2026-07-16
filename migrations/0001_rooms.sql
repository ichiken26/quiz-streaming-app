CREATE TABLE IF NOT EXISTS rooms (
  room_id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  room_name TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rooms_owner_email_updated_at
  ON rooms (owner_email, updated_at DESC);
