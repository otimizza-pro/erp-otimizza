-- Executada atomicamente pelo migration runner.
ALTER TABLE services ADD COLUMN presentation JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(presentation) = 'object');
