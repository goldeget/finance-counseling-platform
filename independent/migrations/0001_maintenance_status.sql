CREATE TABLE IF NOT EXISTS maintenance_status (
  name TEXT PRIMARY KEY,
  completed_at TEXT NOT NULL,
  deleted INTEGER NOT NULL CHECK(deleted >= 0),
  more INTEGER NOT NULL CHECK(more IN (0,1))
);
