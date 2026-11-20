CREATE TABLE content_brainstorm_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES content_brainstorm_searches(id) ON DELETE CASCADE,
  tokens bigint NOT NULL CHECK (tokens >= 0)
);

CREATE TABLE content_brainstorm_weekly_reviews (
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  recommendations jsonb NOT NULL,
  PRIMARY KEY (client_id, week_start)
);

ALTER TABLE content_brainstorm_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_brainstorm_weekly_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_brainstorm_generations, content_brainstorm_weekly_reviews FROM anon, authenticated;

ALTER TABLE content_brainstorm_ideas ADD COLUMN generation_id uuid
  REFERENCES content_brainstorm_generations(id) ON DELETE SET NULL;
CREATE INDEX content_brainstorm_generation_search ON content_brainstorm_generations(search_id);
CREATE INDEX content_brainstorm_idea_generation ON content_brainstorm_ideas(generation_id);

ALTER TABLE content_calendar_items ADD COLUMN stale_materials text[] NOT NULL DEFAULT '{}';

CREATE FUNCTION track_content_material_revisions() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  premise_changed boolean;
  material text;
  previous jsonb := to_jsonb(OLD);
  current_post jsonb := to_jsonb(NEW);
BEGIN
  premise_changed := ROW(OLD.central_idea, OLD.selected_headline, OLD.selected_subheadline,
    OLD.headline_brief, OLD.editorial_brief, OLD.format, OLD.editorial_line_id,
    OLD.target_audience_name, OLD.tone_of_voice, OLD.call_to_action)
    IS DISTINCT FROM ROW(NEW.central_idea, NEW.selected_headline, NEW.selected_subheadline,
    NEW.headline_brief, NEW.editorial_brief, NEW.format, NEW.editorial_line_id,
    NEW.target_audience_name, NEW.tone_of_voice, NEW.call_to_action);
  NEW.stale_materials := OLD.stale_materials;
  FOREACH material IN ARRAY ARRAY['selected_caption','selected_reels','selected_carousel',
    'copy_site_lp','copy_meta_ads','copy_google_ads','visual_prompt','image_url']
  LOOP
    IF NULLIF(btrim(current_post->>material), '') IS NULL THEN
      NEW.stale_materials := array_remove(NEW.stale_materials, material);
    ELSIF premise_changed OR (material = 'image_url'
      AND OLD.visual_prompt IS DISTINCT FROM NEW.visual_prompt
      AND OLD.image_url IS NOT DISTINCT FROM NEW.image_url) THEN
      IF NOT material = ANY(NEW.stale_materials) THEN
        NEW.stale_materials := array_append(NEW.stale_materials, material);
      END IF;
    ELSIF previous->>material IS DISTINCT FROM current_post->>material THEN
      NEW.stale_materials := array_remove(NEW.stale_materials, material);
    END IF;
  END LOOP;
  NEW.headline_content_stale := NEW.stale_materials &&
    ARRAY['selected_caption','selected_reels','selected_carousel'];
  RETURN NEW;
END;
$$;

UPDATE content_calendar_items
SET stale_materials = array_remove(ARRAY[
  CASE WHEN selected_caption IS NOT NULL THEN 'selected_caption' END,
  CASE WHEN selected_reels IS NOT NULL THEN 'selected_reels' END,
  CASE WHEN selected_carousel IS NOT NULL THEN 'selected_carousel' END
], NULL)
WHERE headline_content_stale;

CREATE TRIGGER content_material_revisions
BEFORE UPDATE ON content_calendar_items
FOR EACH ROW EXECUTE FUNCTION track_content_material_revisions();
