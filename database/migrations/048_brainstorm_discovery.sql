CREATE TABLE content_brainstorm_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  scope_key text NOT NULL,
  checked_at timestamptz,
  checked_sources text[] NOT NULL DEFAULT '{}',
  lease_token uuid,
  lease_until timestamptz,
  UNIQUE (client_id, scope_key)
);

ALTER TABLE content_brainstorm_searches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_brainstorm_searches FROM anon, authenticated;

ALTER TABLE content_brainstorm_ideas
  ADD COLUMN search_id uuid REFERENCES content_brainstorm_searches(id) ON DELETE CASCADE,
  ADD COLUMN source_title text,
  ADD COLUMN source_url text,
  ADD COLUMN source_date date;

CREATE INDEX idx_brainstorm_ideas_search ON content_brainstorm_ideas(search_id, created_at DESC);
