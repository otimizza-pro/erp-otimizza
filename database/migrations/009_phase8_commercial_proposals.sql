-- ==============================================================================
-- Migração 009: Fase 8 - Propostas Comerciais, Versionamento Imutável,
-- Precificação Multi-Periodicidade, Auditoria e Conversão em Contratos
-- ==============================================================================

-- 1. Sequência para numeração legível e padronizada de propostas (ex: PROP-00001)
CREATE SEQUENCE IF NOT EXISTS proposal_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Propostas Comerciais (Cabeçalho da Entidade)
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_code VARCHAR(30) NOT NULL UNIQUE DEFAULT ('PROP-' || LPAD(nextval('proposal_number_seq')::TEXT, 5, '0')),
    title VARCHAR(200) NOT NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELED')),
    current_version_number INT NOT NULL DEFAULT 1 CHECK (current_version_number >= 1),
    approved_version_number INT,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    canceled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    valid_until DATE NOT NULL,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ,
    CONSTRAINT chk_proposals_target CHECK (lead_id IS NOT NULL OR client_id IS NOT NULL),
    CONSTRAINT chk_proposals_approved CHECK (
        (status <> 'APPROVED') OR (approved_version_number IS NOT NULL AND approved_at IS NOT NULL)
    ),
    CONSTRAINT chk_proposals_rejected CHECK (
        (status <> 'REJECTED') OR (rejected_at IS NOT NULL AND rejection_reason IS NOT NULL)
    ),
    CONSTRAINT chk_proposals_canceled CHECK (
        (status <> 'CANCELED') OR (canceled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client_id ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_opportunity_id ON proposals(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_valid_until ON proposals(valid_until);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at);

-- 3. Tabela de Versões de Proposta (Snapshot Imutável)
CREATE TABLE IF NOT EXISTS proposal_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    version_number INT NOT NULL CHECK (version_number >= 1),
    version_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (version_status IN ('DRAFT', 'SENT', 'APPROVED', 'SUPERSEDED', 'REJECTED')),
    recipient_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    commercial_terms_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    subtotal_one_time NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_one_time >= 0),
    subtotal_monthly NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_monthly >= 0),
    subtotal_yearly NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_yearly >= 0),
    discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0),
    total_one_time_effective NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_one_time_effective >= 0),
    total_monthly_effective NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_monthly_effective >= 0),
    total_yearly_effective NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_yearly_effective >= 0),
    estimated_one_time_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_one_time_cost >= 0),
    estimated_monthly_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_monthly_cost >= 0),
    estimated_yearly_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_yearly_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMPTZ,
    CONSTRAINT uq_proposal_version_number UNIQUE (proposal_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id ON proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_versions_status ON proposal_versions(version_status);

-- 4. Tabela de Itens da Versão da Proposta
CREATE TABLE IF NOT EXISTS proposal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_version_id UUID NOT NULL REFERENCES proposal_versions(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('SERVICE', 'COMBO')),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    service_name VARCHAR(150) NOT NULL,
    combo_id UUID REFERENCES combos(id) ON DELETE SET NULL,
    combo_name VARCHAR(150),
    description_snapshot TEXT,
    periodicity VARCHAR(20) NOT NULL CHECK (periodicity IN ('ONE_TIME', 'MONTHLY', 'YEARLY')),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    reference_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (reference_unit_price >= 0),
    negotiated_unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (negotiated_unit_price >= 0),
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name_snapshot VARCHAR(200),
    cost_periodicity VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proposal_items_version_id ON proposal_items(proposal_version_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_service_id ON proposal_items(service_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_combo_id ON proposal_items(combo_id);

-- 5. Tabela de Auditoria e Linha do Tempo da Proposta
CREATE TABLE IF NOT EXISTS proposal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    proposal_version_id UUID REFERENCES proposal_versions(id) ON DELETE SET NULL,
    event_type VARCHAR(40) NOT NULL,
    previous_state VARCHAR(20),
    new_state VARCHAR(20),
    details JSONB DEFAULT '{}'::jsonb,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal_id ON proposal_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_created_at ON proposal_events(created_at);

-- 6. Tabela de Conversões de Proposta em Contrato (Garantia de Idempotência)
CREATE TABLE IF NOT EXISTS proposal_contract_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
    proposal_version_id UUID NOT NULL REFERENCES proposal_versions(id) ON DELETE RESTRICT,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    converted_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    periodicity VARCHAR(20) NOT NULL CHECK (periodicity IN ('ONE_TIME', 'MONTHLY', 'YEARLY')),
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prop_conv_proposal_id ON proposal_contract_conversions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_prop_conv_contract_id ON proposal_contract_conversions(contract_id);

-- 7. Vínculos e Extensões nas Tabelas Existentes
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proposal_code VARCHAR(30);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_crm_opportunities_proposal'
    ) THEN
        ALTER TABLE crm_opportunities 
        ADD CONSTRAINT fk_crm_opportunities_proposal 
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 8. Ativação de RLS e Hardening de Segurança (Seguindo Migration 008)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_contract_conversions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE proposals FROM anon, authenticated;
REVOKE ALL ON TABLE proposal_versions FROM anon, authenticated;
REVOKE ALL ON TABLE proposal_items FROM anon, authenticated;
REVOKE ALL ON TABLE proposal_events FROM anon, authenticated;
REVOKE ALL ON TABLE proposal_contract_conversions FROM anon, authenticated;
REVOKE USAGE, SELECT ON SEQUENCE proposal_number_seq FROM anon, authenticated;
