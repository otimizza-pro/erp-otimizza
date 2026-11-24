-- 058_client_catalog_and_strategic_fields.sql
-- Catálogo de Produtos e Serviços estruturados do Cliente com vínculo a Públicos-Alvo
-- e separação de campos de contexto estratégico prévio (Histórico, Promessa, Não-Negociáveis, Objeções).

CREATE TABLE IF NOT EXISTS public.client_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'SERVICE' CHECK (type IN ('SERVICE', 'PRODUCT')),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    differentials TEXT NOT NULL DEFAULT '',
    deliverables TEXT NOT NULL DEFAULT '',
    target_audience_ids UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_catalog_items_client ON public.client_catalog_items(client_id);
ALTER TABLE public.client_catalog_items ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE public.client_catalog_items TO postgres, service_role;

-- Campos separados de contexto estratégico e CNPJ no briefing
ALTER TABLE public.client_briefing_sessions
    ADD COLUMN IF NOT EXISTS brand_history TEXT,
    ADD COLUMN IF NOT EXISTS core_promise TEXT,
    ADD COLUMN IF NOT EXISTS non_negotiables TEXT,
    ADD COLUMN IF NOT EXISTS sales_objections TEXT,
    ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cnae_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cnae_description TEXT;

-- Campos correspondentes no DNA / Identidade do Cliente
ALTER TABLE public.client_identities
    ADD COLUMN IF NOT EXISTS brand_history TEXT,
    ADD COLUMN IF NOT EXISTS core_promise TEXT,
    ADD COLUMN IF NOT EXISTS sales_objections TEXT;
