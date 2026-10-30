-- Migração 004: Fase 3 - Motor Financeiro, Contas a Pagar, Contas a Receber, Liquidações e Movimentações de Caixa
-- Suporta títulos avulsos e recorrentes, baixas parciais e integrais, estornos,
-- regras de idempotência por competência e integridade referencial com contratos da Fase 2.

-- 1. Sequência para numeração legível de títulos a receber e a pagar (ex: REC-00001, PAG-00001)
CREATE SEQUENCE IF NOT EXISTS receivable_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS payable_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS statement_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Contas a Receber (Receivables)
CREATE TABLE IF NOT EXISTS receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    -- Vínculo opcional com contratação e versão da Fase 2
    contract_id UUID REFERENCES contracts(id) ON DELETE RESTRICT,
    contract_version_id UUID REFERENCES contract_versions(id) ON DELETE RESTRICT,
    receivable_number VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    -- Competência no formato YYYY-MM
    competency VARCHAR(7) NOT NULL,
    due_date DATE NOT NULL,
    original_amount NUMERIC(14, 2) NOT NULL CHECK (original_amount > 0),
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_amount NUMERIC(14, 2) NOT NULL CHECK (balance_amount >= 0),
    -- Status derivado: PENDING, OVERDUE, PARTIALLY_PAID, PAID, CANCELED
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELED')),
    -- Chave unívoca de idempotência de recorrência (ex: "REC_contractId_YYYY-MM")
    idempotency_key VARCHAR(100),
    cancellation_reason TEXT,
    canceled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_receivables_idempotency_key 
ON receivables(idempotency_key) 
WHERE idempotency_key IS NOT NULL AND status <> 'CANCELED';

CREATE INDEX IF NOT EXISTS idx_receivables_client_id ON receivables(client_id);
CREATE INDEX IF NOT EXISTS idx_receivables_contract_id ON receivables(contract_id);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_competency ON receivables(competency);
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Modelos de Despesas Recorrentes (Payable Recurring Templates)
CREATE TABLE IF NOT EXISTS payable_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name VARCHAR(150) NOT NULL,
    category_id UUID REFERENCES financial_categories(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('MONTHLY', 'YEARLY')),
    due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    is_indefinite BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payable_templates_status ON payable_templates(status);
ALTER TABLE payable_templates ENABLE ROW LEVEL SECURITY;

-- 4. Tabela de Contas a Pagar (Payables)
CREATE TABLE IF NOT EXISTS payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_template_id UUID REFERENCES payable_templates(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(150) NOT NULL,
    category_id UUID REFERENCES financial_categories(id) ON DELETE RESTRICT,
    -- Vínculo opcional para apropriação e rentabilidade de serviços/contratos
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    payable_number VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    competency VARCHAR(7) NOT NULL,
    due_date DATE NOT NULL,
    original_amount NUMERIC(14, 2) NOT NULL CHECK (original_amount > 0),
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_amount NUMERIC(14, 2) NOT NULL CHECK (balance_amount >= 0),
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELED')),
    -- Chave unívoca de idempotência para despesas recorrentes (ex: "PAG_templateId_YYYY-MM")
    idempotency_key VARCHAR(100),
    cancellation_reason TEXT,
    canceled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payables_idempotency_key 
ON payables(idempotency_key) 
WHERE idempotency_key IS NOT NULL AND status <> 'CANCELED';

CREATE INDEX IF NOT EXISTS idx_payables_supplier ON payables(supplier_name);
CREATE INDEX IF NOT EXISTS idx_payables_category_id ON payables(category_id);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(due_date);
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables(status);
CREATE INDEX IF NOT EXISTS idx_payables_competency ON payables(competency);
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;

-- 5. Tabela de Liquidações e Baixas (Settlements)
-- Suporta múltiplas baixas para a mesma obrigação e estornos auditados
CREATE TABLE IF NOT EXISTS financial_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Um settlement pode ser para uma receivable OU payable
    receivable_id UUID REFERENCES receivables(id) ON DELETE RESTRICT,
    payable_id UUID REFERENCES payables(id) ON DELETE RESTRICT,
    financial_account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    -- Tipo da operação de liquidação: PAYMENT (pagamento de conta a pagar), RECEIPT (recebimento de conta a receber), REVERSAL (estorno)
    settlement_type VARCHAR(20) NOT NULL CHECK (settlement_type IN ('PAYMENT', 'RECEIPT', 'REVERSAL')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    settlement_date DATE NOT NULL,
    notes TEXT,
    -- Se for um estorno, referencia o settlement original revertido
    reversed_settlement_id UUID REFERENCES financial_settlements(id) ON DELETE RESTRICT,
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_settlement_target CHECK (
        (receivable_id IS NOT NULL AND payable_id IS NULL) OR
        (receivable_id IS NULL AND payable_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_settlements_receivable ON financial_settlements(receivable_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payable ON financial_settlements(payable_id);
CREATE INDEX IF NOT EXISTS idx_settlements_account ON financial_settlements(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON financial_settlements(settlement_date);
ALTER TABLE financial_settlements ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de Movimentações de Extrato de Contas (Financial Account Statements / Cashflow Ledger)
-- Permite que o saldo de cada conta seja rigorosamente rastreável e auditável através do razão de transações
CREATE TABLE IF NOT EXISTS financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
    statement_number VARCHAR(30) NOT NULL UNIQUE,
    -- INFLOW (entrada), OUTFLOW (saída), TRANSFER_IN (transferência recebida), TRANSFER_OUT (transferência enviada)
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('INFLOW', 'OUTFLOW', 'TRANSFER_IN', 'TRANSFER_OUT')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(14, 2) NOT NULL,
    movement_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    settlement_id UUID REFERENCES financial_settlements(id) ON DELETE RESTRICT,
    transfer_pair_id UUID, -- Vincula as duas pernas de uma transferência interna
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_statements_account ON financial_statements(account_id);
CREATE INDEX IF NOT EXISTS idx_statements_date ON financial_statements(movement_date);
CREATE INDEX IF NOT EXISTS idx_statements_transfer ON financial_statements(transfer_pair_id);
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;
