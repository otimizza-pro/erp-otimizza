-- 063_brainstorm_model_name.sql
-- Registra qual modelo de IA gerou cada ideia no Brainstorm para exibição nos cards.

ALTER TABLE public.content_brainstorm_ideas
  ADD COLUMN IF NOT EXISTS model_name TEXT;
