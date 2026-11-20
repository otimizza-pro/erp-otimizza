CREATE TABLE content_production_checklist (
  content_id uuid NOT NULL REFERENCES content_calendar_items(id) ON DELETE CASCADE,
  format_key text NOT NULL,
  item_key text NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (content_id, format_key, item_key)
);

ALTER TABLE content_production_checklist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_production_checklist FROM anon, authenticated;
