-- 046_content_creation_pipeline.sql
-- Adiciona suporte para pipeline criativo completo de 6 etapas:
-- 1. Estratégia Completa (diretrizes de formatos na identidade)
-- 2. Brainstorm (times A e B)
-- 3. Headlines
-- 4. Textos multiplataforma (Reels, Feed, Carrossel, Site/LP, Meta Ads, Google Ads)
-- 5. Prompts visuais detalhados (Capa de Reels, Cards Carrossel, Feed, Anúncio)
-- 6. Agendamento com status e arte

ALTER TABLE public.content_calendar_items
  ADD COLUMN IF NOT EXISTS visual_prompt TEXT,
  ADD COLUMN IF NOT EXISTS visual_format VARCHAR(50) DEFAULT 'FEED_IMAGE',
  ADD COLUMN IF NOT EXISTS copy_site_lp TEXT,
  ADD COLUMN IF NOT EXISTS copy_meta_ads TEXT,
  ADD COLUMN IF NOT EXISTS copy_google_ads TEXT;

ALTER TABLE public.client_identities
  ADD COLUMN IF NOT EXISTS format_guidelines JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.content_brainstorm_ideas
  ADD COLUMN IF NOT EXISTS team VARCHAR(10) DEFAULT 'A';
