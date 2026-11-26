-- 067_content_format_config.sql
-- Persiste as especificações técnicas por formato (Reels, Carrossel, Legenda, LP, Meta/Google Ads)
-- diretamente na peça/post do projeto para virem pré-preenchidas no Estúdio Criativo.

ALTER TABLE public.content_calendar_items
  ADD COLUMN IF NOT EXISTS format_config JSONB NOT NULL DEFAULT '{}'::jsonb;
