-- 061_client_audience_catalog_items.sql
-- Tabela de relacionamento N:N entre Públicos-Alvo e Produtos/Serviços do Cliente,
-- controle de versão atômico para concorrência de edição em Identidade/Estratégia
-- e integridade de vinculação de pilares/temas editoriais.

-- 1. Controle de versão atômico para concorrência em client_identities
ALTER TABLE public.client_identities
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 2. Tabela de junção N:N de Públicos e Ofertas (Catálogo)
CREATE TABLE IF NOT EXISTS public.client_audience_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    audience_id UUID NOT NULL REFERENCES public.client_audiences(id) ON DELETE CASCADE,
    catalog_item_id UUID NOT NULL REFERENCES public.client_catalog_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_audience_catalog_item UNIQUE (audience_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS idx_audience_catalog_client ON public.client_audience_catalog_items(client_id);
CREATE INDEX IF NOT EXISTS idx_audience_catalog_aud ON public.client_audience_catalog_items(audience_id);
CREATE INDEX IF NOT EXISTS idx_audience_catalog_item ON public.client_audience_catalog_items(catalog_item_id);

ALTER TABLE public.client_audience_catalog_items ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE public.client_audience_catalog_items TO postgres, service_role;

-- 3. Backfill da tabela de junção a partir de target_audience_ids existentes em client_catalog_items
DO $$
BEGIN
    INSERT INTO public.client_audience_catalog_items (client_id, audience_id, catalog_item_id)
    SELECT 
        c.client_id,
        aud_id,
        c.id
    FROM public.client_catalog_items c
    CROSS JOIN LATERAL unnest(c.target_audience_ids) AS aud_id
    JOIN public.client_audiences a ON a.id = aud_id AND a.client_id = c.client_id
    ON CONFLICT (audience_id, catalog_item_id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    -- Não bloquear caso os dados já tenham sido migrados
    NULL;
END $$;

-- 4. Associação inequívoca de linhas editoriais antigas sem pillar_id ao respectivo pilar pelo nome
UPDATE public.client_editorial_lines l
SET pillar_id = p.id
FROM public.client_editorial_pillars p
WHERE l.pillar_id IS NULL
  AND l.client_id = p.client_id
  AND lower(trim(l.pillar_name)) = lower(trim(p.name));
