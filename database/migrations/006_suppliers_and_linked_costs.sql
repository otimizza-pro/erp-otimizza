-- Migração 006: Fornecedores, Custos Vinculados, Rateios e Apropriação por Competência
-- Garante integridade histórica (sem ON DELETE CASCADE), proteção contra concorrência e tratamento de dados legados.

-- 1. Sequência para numeração amigável de fornecedores (ex: FORN-00001)
CREATE SEQUENCE IF NOT EXISTS supplier_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Fornecedores (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(30) NOT NULL UNIQUE DEFAULT ('FORN-' || LPAD(nextval('supplier_number_seq')::TEXT, 5, '0')),
    person_type VARCHAR(2) NOT NULL CHECK (person_type IN ('PF', 'PJ')),
    name VARCHAR(200) NOT NULL,
    trade_name VARCHAR(200),
    document VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    category VARCHAR(100),
    postal_code VARCHAR(10),
    street VARCHAR(255),
    number VARCHAR(30),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_document 
ON suppliers(document) 
WHERE document IS NOT NULL AND document <> '' AND status <> 'ARCHIVED';

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- 3. Extensão da Tabela de Serviços (Catálogo): Fornecedor Padrão e Custo de Referência
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS default_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (default_cost >= 0),
ADD COLUMN IF NOT EXISTS default_cost_periodicity VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' 
    CHECK (default_cost_periodicity IN ('ONE_TIME', 'MONTHLY', 'YEARLY', 'UNCLASSIFIED'));

CREATE INDEX IF NOT EXISTS idx_services_default_supplier_id ON services(default_supplier_id);

-- 4. Extensão dos Itens de Contrato: Snapshot do Fornecedor e Periodicidade de Custo
ALTER TABLE contract_items 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS supplier_name_snapshot VARCHAR(200),
ADD COLUMN IF NOT EXISTS cost_periodicity VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' 
    CHECK (cost_periodicity IN ('ONE_TIME', 'MONTHLY', 'YEARLY', 'UNCLASSIFIED')),
ADD COLUMN IF NOT EXISTS is_legacy_cost BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_contract_items_supplier_id ON contract_items(supplier_id);

-- Identificar registros legados sem periodicidade confiável (requisito 3)
UPDATE contract_items 
SET cost_periodicity = 'UNCLASSIFIED', is_legacy_cost = true
WHERE unit_cost > 0 AND supplier_id IS NULL AND is_legacy_cost = false;

-- 5. Extensão de Contas a Pagar: Snapshot de Fornecedor e Controle de Rateio
ALTER TABLE payables 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS supplier_name_snapshot VARCHAR(200),
ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_amount >= 0),
ADD COLUMN IF NOT EXISTS unallocated_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (unallocated_amount >= 0);

-- Inicializar unallocated_amount para títulos legados
UPDATE payables 
SET unallocated_amount = (original_amount - allocated_amount) 
WHERE unallocated_amount = 0.00 AND original_amount > 0 AND allocated_amount = 0.00;

CREATE INDEX IF NOT EXISTS idx_payables_supplier_id ON payables(supplier_id);

-- 6. Tabela de Rateio de Despesas (Payable Allocations)
-- SEM ON DELETE CASCADE: integridade histórica rigorosa protegida por ON DELETE RESTRICT
CREATE TABLE IF NOT EXISTS payable_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_id UUID NOT NULL REFERENCES payables(id) ON DELETE RESTRICT,
    contract_id UUID REFERENCES contracts(id) ON DELETE RESTRICT,
    contract_item_id UUID REFERENCES contract_items(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount > 0),
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE NOT NULL,
    cost_periodicity VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' 
        CHECK (cost_periodicity IN ('ONE_TIME', 'MONTHLY', 'YEARLY', 'UNCLASSIFIED')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED', 'REVERSED')),
    cancellation_reason TEXT,
    canceled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_alloc_dates CHECK (coverage_end_date >= coverage_start_date)
);

CREATE INDEX IF NOT EXISTS idx_allocations_payable_id ON payable_allocations(payable_id);
CREATE INDEX IF NOT EXISTS idx_allocations_contract_id ON payable_allocations(contract_id);
CREATE INDEX IF NOT EXISTS idx_allocations_service_id ON payable_allocations(service_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON payable_allocations(status);

ALTER TABLE payable_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_payable_allocations" ON payable_allocations FOR ALL USING (true) WITH CHECK (true);

-- 7. Tabela de Apropriações Gerenciais por Competência (Cost Accruals)
-- SEM ON DELETE CASCADE: apropriações contábeis imutáveis com unicidade por competência
CREATE TABLE IF NOT EXISTS cost_accruals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES payable_allocations(id) ON DELETE RESTRICT,
    payable_id UUID NOT NULL REFERENCES payables(id) ON DELETE RESTRICT,
    contract_id UUID REFERENCES contracts(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES services(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    competency_month VARCHAR(7) NOT NULL CHECK (competency_month ~ '^\d{4}-\d{2}$'),
    accrual_amount NUMERIC(14, 2) NOT NULL CHECK (accrual_amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACCRUED' CHECK (status IN ('ACCRUED', 'CANCELED', 'REVERSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_accrual_alloc_competency UNIQUE (allocation_id, competency_month)
);

CREATE INDEX IF NOT EXISTS idx_cost_accruals_allocation ON cost_accruals(allocation_id);
CREATE INDEX IF NOT EXISTS idx_cost_accruals_contract ON cost_accruals(contract_id);
CREATE INDEX IF NOT EXISTS idx_cost_accruals_service ON cost_accruals(service_id);
CREATE INDEX IF NOT EXISTS idx_cost_accruals_supplier ON cost_accruals(supplier_id);
CREATE INDEX IF NOT EXISTS idx_cost_accruals_competency ON cost_accruals(competency_month);
CREATE INDEX IF NOT EXISTS idx_cost_accruals_status ON cost_accruals(status);

ALTER TABLE cost_accruals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cost_accruals" ON cost_accruals FOR ALL USING (true) WITH CHECK (true);
