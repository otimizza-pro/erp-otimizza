ALTER TABLE content_calendar_items ADD COLUMN origin_content_id uuid
  REFERENCES content_calendar_items(id) ON DELETE SET NULL;
CREATE INDEX content_calendar_origin_idx ON content_calendar_items(origin_content_id);

CREATE TABLE content_material_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES content_calendar_items(id) ON DELETE CASCADE,
  material text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  submitted_by text NOT NULL,
  submitted_by_email text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING', 'APPROVED', 'CHANGES_REQUESTED')),
  decided_by text,
  decided_by_email text,
  decided_at timestamptz,
  comment text,
  UNIQUE (content_id, material, version)
);

CREATE TABLE content_publications (
  content_id uuid PRIMARY KEY REFERENCES content_calendar_items(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  published_at timestamptz NOT NULL,
  recorded_by text NOT NULL,
  approved_versions jsonb NOT NULL,
  headline_candidate_id uuid REFERENCES headline_candidates(id) ON DELETE SET NULL,
  objective text,
  primary_metric text NOT NULL CHECK (primary_metric IN ('impressions', 'clicks', 'leads', 'sales'))
);

CREATE TABLE content_publication_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES content_publications(content_id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to date NOT NULL CHECK (date_to >= date_from),
  impressions integer NOT NULL CHECK (impressions >= 0),
  clicks integer NOT NULL CHECK (clicks BETWEEN 0 AND impressions),
  leads integer NOT NULL CHECK (leads >= 0),
  sales integer NOT NULL CHECK (sales >= 0),
  source text NOT NULL,
  recorded_by text NOT NULL,
  UNIQUE (content_id, date_from, date_to)
);

ALTER TABLE content_material_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_publication_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_material_reviews, content_publications, content_publication_metrics FROM anon, authenticated;

CREATE VIEW content_delivery_measurements AS
SELECT id, content_id, date_from, date_to, impressions, clicks, leads, sales, source
FROM content_publication_metrics
UNION ALL
SELECT m.id, m.content_id, m.date_from, m.date_to, m.impressions, m.clicks, m.leads, m.sales, m.source
FROM headline_measurements m
JOIN content_publications p ON p.content_id=m.content_id AND p.headline_candidate_id=m.candidate_id
WHERE m.date_from >= (p.published_at AT TIME ZONE 'America/Sao_Paulo')::date
  AND NOT EXISTS (
    SELECT 1 FROM content_publication_metrics v
    WHERE v.content_id=m.content_id AND v.date_from <= m.date_to AND v.date_to >= m.date_from
  );
REVOKE ALL ON content_delivery_measurements FROM anon, authenticated;

CREATE FUNCTION require_content_publication_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  media_keys text[] := ARRAY['headline','selected_caption','selected_reels','selected_carousel','image_url',
    'copy_site_lp','copy_meta_ads','copy_google_ads'];
  material_key text;
  visible_text text;
  expected jsonb;
  has_material boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'PUBLISHED' THEN
    NEW.status := 'PUBLISHED';
    NEW.scheduled_date := OLD.scheduled_date;
    NEW.scheduled_time := OLD.scheduled_time;
  ELSIF NEW.status = 'PUBLISHED'
    AND NOT EXISTS (SELECT 1 FROM content_publications p WHERE p.content_id=NEW.id) THEN
    RAISE EXCEPTION 'Use Registrar publicação na entrega da peça.';
  ELSIF NEW.content_type = 'SOCIAL_MEDIA' AND NEW.status IN ('APPROVED','SCHEDULED')
    AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
         OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time) THEN
    FOREACH material_key IN ARRAY media_keys LOOP
      visible_text := regexp_replace(CASE WHEN material_key='headline' THEN NEW.selected_headline ELSE to_jsonb(NEW)->>material_key END,
        '^[[:space:]]+|[[:space:]]+$','','g');
      IF NULLIF(visible_text,'') IS NULL THEN CONTINUE; END IF;
      has_material := has_material OR material_key <> 'headline';
      expected := jsonb_build_object('text', visible_text);
      IF material_key = 'headline' THEN
        expected := expected || jsonb_build_object('subtitle',
          regexp_replace(coalesce(NEW.selected_subheadline,''),'^[[:space:]]+|[[:space:]]+$','','g'));
      END IF;
      IF material_key = ANY(NEW.stale_materials) OR NOT EXISTS (
        SELECT 1 FROM (
          SELECT snapshot, decision FROM content_material_reviews
          WHERE content_id=NEW.id AND material=material_key ORDER BY version DESC LIMIT 1
        ) latest WHERE latest.decision='APPROVED' AND latest.snapshot=expected
      ) THEN RAISE EXCEPTION 'Aprove as versões atuais na revisão da peça antes de agendar.'; END IF;
    END LOOP;
    IF NOT has_material THEN RAISE EXCEPTION 'Salve e aprove pelo menos um material antes de agendar.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_publication_required BEFORE INSERT OR UPDATE OF status, scheduled_date, scheduled_time
ON content_calendar_items FOR EACH ROW EXECUTE FUNCTION require_content_publication_record();
