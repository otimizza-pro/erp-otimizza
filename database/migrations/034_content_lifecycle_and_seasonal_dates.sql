-- Complements 033 without changing previously applied migrations.
CREATE TABLE content_seasonal_dates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
 event_date date NOT NULL,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),
 category text NOT NULL CHECK(category IN ('commercial','holiday','cultural')),
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 archived_at timestamptz
);
CREATE INDEX content_seasonal_client_date ON content_seasonal_dates(client_id,event_date);
ALTER TABLE content_seasonal_dates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_seasonal_dates FROM anon,authenticated;
ALTER TABLE digital_presence_materials ADD COLUMN archived_at timestamptz;
ALTER TABLE crm_opportunities ADD COLUMN archived_at timestamptz;
ALTER TABLE crm_activities ADD COLUMN archived_at timestamptz;
ALTER TABLE password_vault_entries ADD COLUMN archived_at timestamptz;
