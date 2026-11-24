-- 060_brainstorm_offer_and_refinement_rounds.sql
-- Adiciona suporte a produto/serviço, ângulo de abordagem, pergunta do público,
-- requisitos de material, hipótese vs fato e rastreabilidade de rodadas e refinamentos sucessivos.

ALTER TABLE public.content_brainstorm_ideas
    ADD COLUMN IF NOT EXISTS offer_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.client_catalog_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS audience_angle TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS angle_focus TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS audience_question TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS required_material TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_hypothesis BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS parent_idea_id UUID REFERENCES public.content_brainstorm_ideas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS refinement_type TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_brainstorm_ideas_round ON public.content_brainstorm_ideas(client_id, round_number);
CREATE INDEX IF NOT EXISTS idx_brainstorm_ideas_parent ON public.content_brainstorm_ideas(parent_idea_id);

-- Enriquecer itens do calendário de conteúdo com oferta, ângulo e material para o Estúdio Criativo
ALTER TABLE public.content_calendar_items
    ADD COLUMN IF NOT EXISTS offer_name TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS audience_angle TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS required_material TEXT DEFAULT '';
