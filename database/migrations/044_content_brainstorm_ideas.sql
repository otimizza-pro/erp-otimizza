-- Migration 044: Content Brainstorm Ideas (Backlog de temas e ideias pré-headline)
CREATE TABLE IF NOT EXISTS content_brainstorm_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES client_editorial_pillars(id) ON DELETE SET NULL,
  editorial_line_id uuid REFERENCES client_editorial_lines(id) ON DELETE SET NULL,
  pillar_name text NOT NULL DEFAULT '',
  theme_name text NOT NULL DEFAULT '',
  title text NOT NULL CHECK(length(btrim(title)) > 0),
  angle text NOT NULL DEFAULT '',
  format text NOT NULL DEFAULT 'Carrossel',
  target_audience text NOT NULL DEFAULT '',
  pain_or_desire text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',
  rationale text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'IDEA' CHECK(status IN ('IDEA', 'HEADLINES_IN_PROGRESS', 'HEADLINE_CHOSEN', 'IN_CREATION', 'DONE', 'ARCHIVED')),
  workspace_id uuid REFERENCES headline_workspaces(id) ON DELETE SET NULL,
  content_id uuid REFERENCES content_calendar_items(id) ON DELETE SET NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brainstorm_ideas_client ON content_brainstorm_ideas(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brainstorm_ideas_pillar ON content_brainstorm_ideas(pillar_id);
CREATE INDEX IF NOT EXISTS idx_brainstorm_ideas_editorial ON content_brainstorm_ideas(editorial_line_id);

ALTER TABLE content_brainstorm_ideas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_brainstorm_ideas FROM anon, authenticated;
