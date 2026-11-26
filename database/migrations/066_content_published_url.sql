-- 066_content_published_url.sql
-- Permite registrar o link direto da publicação finalizada nos itens do calendário / Feed & Criativos

ALTER TABLE public.content_calendar_items
  ADD COLUMN IF NOT EXISTS published_url TEXT;
