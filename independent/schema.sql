CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  reference TEXT UNIQUE,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON applications(created_at);
CREATE TABLE IF NOT EXISTS submission_limits (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  author TEXT NOT NULL,
  source TEXT NOT NULL,
  rating REAL NOT NULL,
  content TEXT NOT NULL,
  review_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_date_idx ON reviews(review_date DESC,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS reviews_rating_date_idx ON reviews(rating,review_date DESC,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS review_stats (
  rating REAL PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL CHECK(count>=0)
);
