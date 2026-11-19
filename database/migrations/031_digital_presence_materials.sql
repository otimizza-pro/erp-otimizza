-- Editable creation materials; no external campaigns or sites are published here.
CREATE TABLE IF NOT EXISTS digital_presence_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  area TEXT NOT NULL CHECK(area IN ('meta-ads','google-ads','landing-pages','websites','google-business','search','domains','hosting','web-settings')),
  title VARCHAR(255) NOT NULL,
  output_label TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}',
  audience TEXT NOT NULL,
  guidance TEXT NOT NULL DEFAULT '',
  material JSONB NOT NULL CHECK(jsonb_typeof(material)='object'),
  model_used VARCHAR(150),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_presence_client_area_date ON digital_presence_materials(client_id,area,created_at DESC);
ALTER TABLE digital_presence_materials ENABLE ROW LEVEL SECURITY;
-- ERP server access requires requireAdminUser; no anonymous/authenticated direct policies.
REVOKE ALL ON digital_presence_materials FROM anon, authenticated;
