-- 059_client_catalog_enhancements.sql
-- Adiciona campos de dor e resolução nos itens de catálogo (serviços/produtos)
-- e coluna de catálogo estruturado nas sessões de briefing e identidade.

ALTER TABLE public.client_catalog_items
    ADD COLUMN IF NOT EXISTS target_pain_points TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS solution_approach TEXT NOT NULL DEFAULT '';

ALTER TABLE public.client_briefing_sessions
    ADD COLUMN IF NOT EXISTS catalog_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.client_identities
    ADD COLUMN IF NOT EXISTS catalog_items JSONB NOT NULL DEFAULT '[]'::jsonb;
