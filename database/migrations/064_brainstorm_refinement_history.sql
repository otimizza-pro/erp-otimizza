-- 064_brainstorm_refinement_history.sql
-- Armazena o histórico de lapidação entre IAs (Time A <-> Time B) em cada ideia do Brainstorm.

ALTER TABLE public.content_brainstorm_ideas
  ADD COLUMN IF NOT EXISTS refinement_history JSONB;
