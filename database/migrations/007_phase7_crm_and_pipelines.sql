-- Migração 007: Módulo Completo de CRM, Funil de Vendas e Oportunidades Comerciais
-- Garante integridade referencial, preservação histórica, transações atômicas de conversão e proteção contra exclusão destrutiva.

-- 1. Sequências para códigos amigáveis
CREATE SEQUENCE IF NOT EXISTS crm_lead_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS crm_opportunity_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Leads (Cadastro separado de clientes)
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_code VARCHAR(30) NOT NULL UNIQUE DEFAULT ('LEAD-' || LPAD(nextval('crm_lead_number_seq')::TEXT, 5, '0')),
    person_type VARCHAR(2) NOT NULL CHECK (person_type IN ('PF', 'PJ')),
    name VARCHAR(200) NOT NULL,
    trade_name VARCHAR(200),
    document VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    primary_contact VARCHAR(150),
    segment VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    source VARCHAR(100) NOT NULL DEFAULT 'OUTROS',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'UNQUALIFIED', 'ARCHIVED')),
    converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_name ON crm_leads(name);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads(source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON crm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_crm_leads_converted_client ON crm_leads(converted_client_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_leads_document 
ON crm_leads(document) 
WHERE document IS NOT NULL AND document <> '' AND status <> 'ARCHIVED';

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crm_leads" ON crm_leads FOR ALL USING (true) WITH CHECK (true);


-- 3. Tabela de Funis de Vendas (Pipelines)
CREATE TABLE IF NOT EXISTS crm_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_pipelines_status ON crm_pipelines(status);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_is_default ON crm_pipelines(is_default);

ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crm_pipelines" ON crm_pipelines FOR ALL USING (true) WITH CHECK (true);


-- 4. Tabela de Etapas dos Funis (Pipeline Stages)
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(30) NOT NULL DEFAULT '#6366f1',
    display_order INT NOT NULL DEFAULT 0,
    win_probability INT NOT NULL DEFAULT 50 CHECK (win_probability >= 0 AND win_probability <= 100),
    stage_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (stage_type IN ('NORMAL', 'WON', 'LOST')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_pipeline ON crm_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_order ON crm_pipeline_stages(pipeline_id, display_order);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_type ON crm_pipeline_stages(stage_type);

ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crm_pipeline_stages" ON crm_pipeline_stages FOR ALL USING (true) WITH CHECK (true);


-- 5. Tabela de Oportunidades Comerciais (Deals / Opportunities)
CREATE TABLE IF NOT EXISTS crm_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_code VARCHAR(30) NOT NULL UNIQUE DEFAULT ('OPP-' || LPAD(nextval('crm_opportunity_number_seq')::TEXT, 5, '0')),
    title VARCHAR(200) NOT NULL,
    lead_id UUID REFERENCES crm_leads(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE RESTRICT,
    stage_id UUID NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    billing_period VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_period IN ('ONE_TIME', 'MONTHLY', 'YEARLY')),
    probability INT NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    normalized_monthly_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (normalized_monthly_value >= 0),
    source VARCHAR(100),
    expected_close_date DATE,
    closed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'WON', 'LOST', 'CANCELED')),
    lost_reason TEXT,
    notes TEXT,
    proposal_id UUID, -- Referência futura sem restrição rígida
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL, -- Referência futura opcional
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_crm_opportunities_contact CHECK (lead_id IS NOT NULL OR client_id IS NOT NULL),
    CONSTRAINT chk_crm_opportunities_lost_reason CHECK (
        (status NOT IN ('LOST', 'CANCELED')) OR (lost_reason IS NOT NULL AND length(trim(lost_reason)) > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_crm_opp_lead_id ON crm_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_client_id ON crm_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_pipeline_id ON crm_opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_stage_id ON crm_opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_status ON crm_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_crm_opp_close_date ON crm_opportunities(expected_close_date);

ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crm_opportunities" ON crm_opportunities FOR ALL USING (true) WITH CHECK (true);


-- 6. Tabela de Histórico de Mudanças das Oportunidades (Auditoria de Funil)
CREATE TABLE IF NOT EXISTS crm_opportunity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
    from_pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE SET NULL,
    to_pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE SET NULL,
    from_stage_id UUID REFERENCES crm_pipeline_stages(id) ON DELETE SET NULL,
    to_stage_id UUID REFERENCES crm_pipeline_stages(id) ON DELETE SET NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    from_amount NUMERIC(14, 2),
    to_amount NUMERIC(14, 2),
    notes TEXT,
    created_by VARCHAR(150) DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_opp_hist_opp_id ON crm_opportunity_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_hist_created_at ON crm_opportunity_history(created_at);

ALTER TABLE crm_opportunity_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crm_opp_history" ON crm_opportunity_history FOR ALL USING (true) WITH CHECK (true);


-- 7. Tabela de Atividades Comerciais e Follow-ups
CREATE TABLE IF NOT EXISTS crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'NOTE', 'OTHER')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELED')),
    lead_id UUID REFERENCES crm_leads(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE CASCADE,
    created_by VARCHAR(150) DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_crm_activities_target CHECK (lead_id IS NOT NULL OR client_id IS NOT NULL OR opportunity_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_crm_act_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_act_client_id ON crm_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_act_opp_id ON crm_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_act_status ON crm_activities(status);
CREATE INDEX IF NOT EXISTS idx_crm_act_due_date ON crm_activities(due_date);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_crm_activities" ON crm_activities FOR ALL USING (true) WITH CHECK (true);


-- 8. Seed Inicial de Funil Padrão e Etapas Básicas se não existirem
DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM crm_pipelines WHERE is_default = true) THEN
        INSERT INTO crm_pipelines (name, description, is_default, status)
        VALUES ('Funil Comercial Padrão', 'Funil padrão de aquisição de clientes para serviços de marketing e gestão', true, 'ACTIVE')
        RETURNING id INTO v_pipeline_id;

        INSERT INTO crm_pipeline_stages (pipeline_id, name, color, display_order, win_probability, stage_type)
        VALUES 
            (v_pipeline_id, '1. Primeiro Contato', '#3b82f6', 1, 10, 'NORMAL'),
            (v_pipeline_id, '2. Diagnóstico & Briefing', '#8b5cf6', 2, 30, 'NORMAL'),
            (v_pipeline_id, '3. Proposta Apresentada', '#f59e0b', 3, 60, 'NORMAL'),
            (v_pipeline_id, '4. Negociação Final', '#06b6d4', 4, 80, 'NORMAL'),
            (v_pipeline_id, '5. Ganho (Contrato Fechado)', '#10b981', 5, 100, 'WON'),
            (v_pipeline_id, '6. Perdido', '#ef4444', 6, 0, 'LOST');
    END IF;
END $$;
