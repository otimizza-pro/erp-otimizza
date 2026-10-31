-- Migração 011: Fase 10 - DRE Gerencial Simplificada, Centros de Custo e Plano Gerencial
-- Suporta Regime de Caixa e Regime de Competência, Centros de Custo configuráveis,
-- Rateio por Centro de Custo com controle estrito de centavos,
-- e Plano de Contas Gerencial com segregação de lançamentos não classificados.

-- 1. Sequência para código de centros de custo
CREATE SEQUENCE IF NOT EXISTS cost_center_code_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Centros de Custo (Cost Centers)
CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    is_system_default BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_status ON cost_centers(status);
CREATE INDEX IF NOT EXISTS idx_cost_centers_code ON cost_centers(code);

-- 3. Semear Centros de Custo Padrão
INSERT INTO cost_centers (code, name, description, is_system_default, status)
VALUES
    ('ADM', 'Administrativo', 'Despesas administrativas gerais, financeiras e estrutura operacional fixa', true, 'ACTIVE'),
    ('COM', 'Comercial', 'Despesas comerciais, vendas, prospecção e marketing institucional', true, 'ACTIVE'),
    ('OPS', 'Operações', 'Custos diretos operacionais e entregas de serviços a clientes', true, 'ACTIVE'),
    ('TEC', 'Tecnologia', 'Ferramentas internas, plataformas, servidores e desenvolvimento', true, 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- 4. Tabela de Plano de Contas Gerencial da DRE (Managerial Accounts)
CREATE TABLE IF NOT EXISTS managerial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    classification_group VARCHAR(40) NOT NULL CHECK (
        classification_group IN (
            'GROSS_REVENUE',          -- 1. Receita Bruta
            'DEDUCTION',              -- 2. (-) Impostos e Deduções
            'DIRECT_COST',             -- 4. (-) Custos Diretos
            'OPERATIONAL_EXPENSE',     -- 6. (-) Despesas Operacionais
            'NON_OPERATIONAL',         -- 8. (+/-) Não Operacionais / Financeiras
            'UNCLASSIFIED'             -- 9. Lançamentos Pendentes de Classificação
        )
    ),
    subgroup VARCHAR(60) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_managerial_acc_group ON managerial_accounts(classification_group);
CREATE INDEX IF NOT EXISTS idx_managerial_acc_order ON managerial_accounts(display_order);

-- 5. Semear Plano Gerencial Padrão da DRE
INSERT INTO managerial_accounts (code, name, classification_group, subgroup, display_order)
VALUES
    ('1.01', 'Receita de Prestação de Serviços', 'GROSS_REVENUE', 'SERVICES', 10),
    ('1.02', 'Receitas de Combos e Projetos Avulsos', 'GROSS_REVENUE', 'SERVICES', 20),
    ('2.01', 'Impostos Diretos e Deduções sobre Receita', 'DEDUCTION', 'TAXES_DEDUCTIONS', 30),
    ('3.01', 'Custos Diretos com Fornecedores e Subcontratados', 'DIRECT_COST', 'SUPPLIERS', 40),
    ('3.02', 'Ferramentas e Licenças Dedicadas a Clientes', 'DIRECT_COST', 'TOOLS', 50),
    ('4.01', 'Despesas Comerciais e Marketing', 'OPERATIONAL_EXPENSE', 'COMMERCIAL', 60),
    ('4.02', 'Despesas Administrativas e Estruturais', 'OPERATIONAL_EXPENSE', 'ADMINISTRATIVE', 70),
    ('4.03', 'Despesas de Tecnologia e Infraestrutura Interna', 'OPERATIONAL_EXPENSE', 'TECHNOLOGY', 80),
    ('5.01', 'Receitas e Despesas Não Operacionais / Financeiras', 'NON_OPERATIONAL', 'OTHER', 90),
    ('9.99', 'Lançamentos Não Classificados', 'UNCLASSIFIED', 'UNCLASSIFIED', 999)
ON CONFLICT (code) DO NOTHING;

-- 6. Extensão de Categorias Financeiras com Plano Gerencial e Centro de Custo Padrão
ALTER TABLE financial_categories
ADD COLUMN IF NOT EXISTS managerial_account_id UUID REFERENCES managerial_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_cat_managerial ON financial_categories(managerial_account_id);
CREATE INDEX IF NOT EXISTS idx_fin_cat_cost_center ON financial_categories(default_cost_center_id);

-- 7. Extensão de Contas a Pagar (Payables) com Centro de Custo e Conta Gerencial
ALTER TABLE payables
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS managerial_account_id UUID REFERENCES managerial_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payables_cost_center ON payables(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_payables_managerial_acc ON payables(managerial_account_id);

-- 8. Tabela de Rateio de Despesas por Centro de Custo (Financial Cost Center Allocations)
-- Permite fracionar um título a pagar entre múltiplos centros de custo de forma auditável e com soma exata
CREATE TABLE IF NOT EXISTS financial_cost_center_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_id UUID NOT NULL REFERENCES payables(id) ON DELETE RESTRICT,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT,
    percentage NUMERIC(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payable_cost_center UNIQUE (payable_id, cost_center_id)
);

CREATE INDEX IF NOT EXISTS idx_fcca_payable ON financial_cost_center_allocations(payable_id);
CREATE INDEX IF NOT EXISTS idx_fcca_cost_center ON financial_cost_center_allocations(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_fcca_status ON financial_cost_center_allocations(status);

-- 9. Tabela de Apropriações de Receita por Competência (Revenue Accruals)
-- Garante reconhecimento econômico no regime de competência com unicidade por contrato e mês
CREATE TABLE IF NOT EXISTS revenue_accruals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE RESTRICT,
    receivable_id UUID REFERENCES receivables(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    competency_month VARCHAR(7) NOT NULL CHECK (competency_month ~ '^\d{4}-\d{2}$'),
    gross_amount NUMERIC(14, 2) NOT NULL CHECK (gross_amount > 0),
    deductions_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (deductions_amount >= 0),
    net_amount NUMERIC(14, 2) NOT NULL CHECK (net_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'RECOGNIZED' CHECK (status IN ('RECOGNIZED', 'CANCELED')),
    recognition_rule VARCHAR(40) NOT NULL DEFAULT 'MONTHLY_CONTRACT',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_accrual_contract_month
ON revenue_accruals (contract_id, competency_month)
WHERE contract_id IS NOT NULL AND status <> 'CANCELED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_accrual_receivable_month
ON revenue_accruals (receivable_id, competency_month)
WHERE receivable_id IS NOT NULL AND status <> 'CANCELED';

CREATE INDEX IF NOT EXISTS idx_rev_accrual_client ON revenue_accruals(client_id);
CREATE INDEX IF NOT EXISTS idx_rev_accrual_competency ON revenue_accruals(competency_month);
CREATE INDEX IF NOT EXISTS idx_rev_accrual_status ON revenue_accruals(status);

-- 10. Ativação de RLS e Políticas de Segurança (Hardening 008 compliance)
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE managerial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_cost_center_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_accruals ENABLE ROW LEVEL SECURITY;

-- Revogar acessos públicos de anon e authenticated para manter o ERP hermético
REVOKE ALL ON cost_centers FROM anon, authenticated;
REVOKE ALL ON managerial_accounts FROM anon, authenticated;
REVOKE ALL ON financial_cost_center_allocations FROM anon, authenticated;
REVOKE ALL ON revenue_accruals FROM anon, authenticated;
REVOKE ALL ON SEQUENCE cost_center_code_seq FROM anon, authenticated;
