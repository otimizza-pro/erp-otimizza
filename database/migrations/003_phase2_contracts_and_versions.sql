-- Migração 003: Fase 2 - Contratações, Versões, Itens Contratados e Vigências
-- Permite múltiplas contratações independentes por cliente, versionamento imutável de vigências,
-- composição de serviços e combos personalizados, regras de periodicidade e cancelamento auditado.

-- 1. Sequência para numeração legível e padronizada de contratos (ex: CTR-00001)
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Contratações (Cabeçalho da Entidade Contrato)
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    contract_number VARCHAR(30) NOT NULL UNIQUE,
    -- Status do ciclo de vida: DRAFT (rascunho), ACTIVE (ativo), ENDED (encerrado pelo término de vigência), CANCELED (cancelado)
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELED')),
    -- Auditoria de cancelamento
    cancellation_reason TEXT,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Versões de Contrato (Snapshot de vigência, regras de cobrança e histórico auditável)
CREATE TABLE IF NOT EXISTS contract_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    -- Periodicidade: ONE_TIME (avulsa), MONTHLY (mensal), YEARLY (anual)
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('ONE_TIME', 'MONTHLY', 'YEARLY')),
    -- Dia de vencimento (1 a 31) com ajuste de fim de mês
    due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    -- Vigência
    start_date DATE NOT NULL,
    end_date DATE,
    is_indefinite BOOLEAN NOT NULL DEFAULT false,
    -- Data de início de vigência desta versão específica
    effective_date DATE NOT NULL,
    -- Valor contratado total nesta versão (soma exata dos itens)
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contract_version_number UNIQUE (contract_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_id ON contract_versions(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_versions_effective_date ON contract_versions(effective_date);
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

-- 4. Tabela de Itens Contratados (Componentes da versão: Serviços do catálogo ou Combos com preços/custos negociados)
CREATE TABLE IF NOT EXISTS contract_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_version_id UUID NOT NULL REFERENCES contract_versions(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    service_name VARCHAR(150) NOT NULL,
    -- Caso o item pertença a um combo de origem (para rastreabilidade comercial sem acoplamento financeiro)
    combo_id UUID REFERENCES combos(id) ON DELETE SET NULL,
    combo_name VARCHAR(150),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    -- Valor unitário negociado e custo unitário personalizado
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_items_version_id ON contract_items(contract_version_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_service_id ON contract_items(service_id);
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
