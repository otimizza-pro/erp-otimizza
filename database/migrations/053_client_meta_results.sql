CREATE TABLE client_meta_reports (
  client_id uuid PRIMARY KEY REFERENCES clients(id),
  active_version bigint
);
CREATE TABLE client_meta_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES client_meta_reports(client_id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  filename text NOT NULL,
  metrics jsonb NOT NULL
);
CREATE INDEX client_meta_versions_recent ON client_meta_versions(client_id,id DESC);
ALTER TABLE client_meta_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_meta_versions ENABLE ROW LEVEL SECURITY;
