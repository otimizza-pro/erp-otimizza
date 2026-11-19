-- Preserve existing editorial lines while giving pillars their own identity.
CREATE TABLE client_editorial_pillars (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),
 name_key text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
 created_at timestamptz NOT NULL DEFAULT now(),
 archived_at timestamptz,
 UNIQUE(client_id,name_key)
);
ALTER TABLE client_editorial_pillars ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON client_editorial_pillars FROM anon,authenticated;
ALTER TABLE client_editorial_lines ADD COLUMN pillar_id uuid REFERENCES client_editorial_pillars(id) ON DELETE CASCADE;
ALTER TABLE client_editorial_lines ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(custom_fields)='array');
ALTER TABLE client_editorial_lines ADD COLUMN archived_at timestamptz;
ALTER TABLE client_audiences ADD COLUMN archived_at timestamptz;
INSERT INTO client_editorial_pillars(client_id,name)
 SELECT DISTINCT client_id,btrim(pillar_name) FROM client_editorial_lines WHERE length(btrim(pillar_name))>0
 ON CONFLICT(client_id,name_key) DO NOTHING;
UPDATE client_editorial_lines l SET pillar_id=p.id FROM client_editorial_pillars p
 WHERE p.client_id=l.client_id AND p.name_key=lower(btrim(l.pillar_name));
CREATE INDEX idx_editorial_lines_pillar ON client_editorial_lines(pillar_id);

-- Legacy editors and AI generation still write pillar_name. Keep them integrated.
CREATE FUNCTION link_editorial_pillar() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE linked client_editorial_pillars%ROWTYPE;
BEGIN
 INSERT INTO client_editorial_pillars(client_id,name) VALUES(NEW.client_id,btrim(NEW.pillar_name))
 ON CONFLICT(client_id,name_key) DO UPDATE SET name=client_editorial_pillars.name RETURNING * INTO linked;
 NEW.pillar_id=linked.id;
 NEW.pillar_name=linked.name;
 RETURN NEW;
END;
$$;
CREATE TRIGGER editorial_pillar_link BEFORE INSERT OR UPDATE OF pillar_name,client_id ON client_editorial_lines
 FOR EACH ROW EXECUTE FUNCTION link_editorial_pillar();

-- Consolidate audience descriptions already entered in the DNA, without removing history.
INSERT INTO client_audiences(client_id,name,description)
 SELECT DISTINCT i.client_id,left(btrim(a.value),255),a.value
 FROM client_identities i CROSS JOIN LATERAL unnest(i.target_audiences) AS a(value)
 WHERE length(btrim(a.value))>0 AND NOT EXISTS (
  SELECT 1 FROM client_audiences existing WHERE existing.client_id=i.client_id AND lower(btrim(existing.name))=lower(left(btrim(a.value),255))
 );
ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS archived_at timestamptz;
