-- Durable outbox: never remove Storage files before the SQL transaction commits.
CREATE TABLE storage_cleanup_queue (
  storage_path text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);
ALTER TABLE storage_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON storage_cleanup_queue FROM anon, authenticated;
