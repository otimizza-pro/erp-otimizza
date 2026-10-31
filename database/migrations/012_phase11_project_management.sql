-- Migração 012: Fase 11 - Gestão de Projetos, Tarefas, Modelos, Horas e Recorrência Operacional
-- Suporta projetos avulsos, recorrentes por contrato e internos,
-- gerenciamento de etapas, tarefas, checklists, apontamentos de horas,
-- templates reutilizáveis e chave de unicidade para evitar duplicidade de projetos recorrentes.

-- 1. Sequências para numeração amigável
CREATE SEQUENCE IF NOT EXISTS project_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS task_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Modelos de Projetos (Project Templates)
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    estimated_days INTEGER NOT NULL DEFAULT 30 CHECK (estimated_days > 0),
    estimated_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_hours >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_templates_status ON project_templates(status);

-- 3. Etapas do Modelo de Projeto
CREATE TABLE IF NOT EXISTS project_template_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_stages_template ON project_template_stages(template_id);

-- 4. Tarefas do Modelo de Projeto
CREATE TABLE IF NOT EXISTS project_template_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES project_template_stages(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    relative_due_days INTEGER NOT NULL DEFAULT 7 CHECK (relative_due_days >= 0),
    estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 1.00 CHECK (estimated_hours >= 0),
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON project_template_tasks(template_id);

-- 5. Semear Modelos Padrão de Projetos
INSERT INTO project_templates (code, name, description, estimated_days, estimated_hours)
VALUES
    ('TMPL-TRAFEGO', 'Gestão Mensal de Tráfego Pago', 'Modelo padrão para gestão recorrente mensal de Google Ads e Meta Ads com ciclos de planejamento, execução e relatório.', 30, 24.00),
    ('TMPL-WEBSITE', 'Desenvolvimento de Website Institucional', 'Modelo completo para criação de websites profissionais com briefing, design, desenvolvimento e homologação.', 45, 60.00)
ON CONFLICT (code) DO NOTHING;

-- Inserir etapas e tarefas do template de tráfego pago se ele existir
DO $$
DECLARE
    tmpl_id UUID;
    stg1 UUID;
    stg2 UUID;
    stg3 UUID;
BEGIN
    SELECT id INTO tmpl_id FROM project_templates WHERE code = 'TMPL-TRAFEGO';
    IF tmpl_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_template_stages WHERE template_id = tmpl_id) THEN
        INSERT INTO project_template_stages (template_id, name, order_index) VALUES (tmpl_id, '1. Planejamento & Alinhamento', 1) RETURNING id INTO stg1;
        INSERT INTO project_template_stages (template_id, name, order_index) VALUES (tmpl_id, '2. Execução & Otimização', 2) RETURNING id INTO stg2;
        INSERT INTO project_template_stages (template_id, name, order_index) VALUES (tmpl_id, '3. Relatórios & Fechamento', 3) RETURNING id INTO stg3;

        INSERT INTO project_template_tasks (template_id, stage_id, title, description, relative_due_days, estimated_hours, order_index)
        VALUES 
            (tmpl_id, stg1, 'Revisar resultados do mês anterior e definir metas', 'Análise de conversões, CPA, ROAS e prioridades estratégicas.', 3, 2.00, 1),
            (tmpl_id, stg1, 'Validar saldo e orçamento disponível nas contas de anúncio', 'Conferir limites, fundos e métodos de pagamento.', 5, 1.00, 2),
            (tmpl_id, stg2, 'Criar e subir novos criativos / copies de anúncios', 'Implementação dos novos testes A/B nas campanhas.', 12, 6.00, 3),
            (tmpl_id, stg2, 'Otimização semanal de palavras-chave e públicos', 'Negativação de termos irrelevantes e refinamento de lances.', 20, 8.00, 4),
            (tmpl_id, stg3, 'Consolidar métricas do período no Dashboard', 'Exportar dados consolidados e preparar gráficos.', 28, 4.00, 5),
            (tmpl_id, stg3, 'Apresentação e envio do relatório mensal ao cliente', 'Reunião de alinhamento com apresentação de resultados.', 30, 3.00, 6);
    END IF;
END $$;

-- 6. Tabela Principal de Projetos (Projects)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number VARCHAR(30) NOT NULL UNIQUE DEFAULT ('PRJ-' || LPAD(nextval('project_number_seq')::TEXT, 5, '0')),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    -- STANDALONE (avulso), RECURRING (recorrente de contrato), INTERNAL (interno)
    project_type VARCHAR(20) NOT NULL DEFAULT 'STANDALONE' CHECK (project_type IN ('STANDALONE', 'RECURRING', 'INTERNAL')),
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    contract_id UUID REFERENCES contracts(id) ON DELETE RESTRICT,
    contract_version_id UUID REFERENCES contract_versions(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES project_templates(id) ON DELETE SET NULL,
    competency VARCHAR(7) CHECK (competency ~ '^\d{4}-\d{2}$'),
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELED')),
    priority VARCHAR(15) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    estimated_budget NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_budget >= 0),
    estimated_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_hours >= 0),
    actual_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (actual_hours >= 0),
    estimated_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_cost >= 0),
    actual_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (actual_cost >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ,
    CONSTRAINT chk_project_target CHECK (
        (project_type = 'INTERNAL') OR (client_id IS NOT NULL)
    ),
    CONSTRAINT chk_project_dates CHECK (due_date >= start_date)
);

-- Constraint de unicidade estrita para projetos recorrentes: apenas 1 projeto por contrato e competência
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_contract_competency
ON projects (contract_id, competency)
WHERE contract_id IS NOT NULL AND competency IS NOT NULL AND status <> 'CANCELED';

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_contract_id ON projects(contract_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_competency ON projects(competency);

-- 7. Etapas do Projeto (Project Stages)
CREATE TABLE IF NOT EXISTS project_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_stages_project ON project_stages(project_id);

-- 8. Tarefas do Projeto (Project Tasks)
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES project_stages(id) ON DELETE SET NULL,
    task_number VARCHAR(30) NOT NULL UNIQUE DEFAULT ('TSK-' || LPAD(nextval('task_number_seq')::TEXT, 5, '0')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELED')),
    priority VARCHAR(15) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_hours >= 0),
    actual_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (actual_hours >= 0),
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_stage ON project_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_due_date ON project_tasks(due_date);

-- 9. Checklists de Tarefas (Project Checklists)
CREATE TABLE IF NOT EXISTS project_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 1,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_checklists_task ON project_checklists(task_id);

-- 10. Apontamentos de Horas e Custos Operacionais (Project Time Entries)
-- Registra horas trabalhadas e custo referencial SEM duplicar obrigações a pagar financeiras
CREATE TABLE IF NOT EXISTS project_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL,
    hours NUMERIC(6, 2) NOT NULL CHECK (hours > 0),
    description VARCHAR(255) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (hourly_rate >= 0),
    calculated_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (calculated_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_time_entries_project ON project_time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON project_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON project_time_entries(entry_date);

-- 11. Configuração de Recorrência Operacional por Contrato (Contract Project Recurring Settings)
-- Habilitação explícita por contrato individual com escolha de template e regras de vigência
CREATE TABLE IF NOT EXISTS contract_project_recurring_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE RESTRICT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE RESTRICT,
    periodicity VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (periodicity IN ('MONTHLY')),
    start_day SMALLINT NOT NULL DEFAULT 1 CHECK (start_day BETWEEN 1 AND 31),
    duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cprs_contract ON contract_project_recurring_settings(contract_id);
CREATE INDEX IF NOT EXISTS idx_cprs_enabled ON contract_project_recurring_settings(is_enabled, is_suspended);

-- 12. Histórico de Geração Recorrente (Project Generation History)
CREATE TABLE IF NOT EXISTS project_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    competency VARCHAR(7) NOT NULL CHECK (competency ~ '^\d{4}-\d{2}$'),
    status VARCHAR(30) NOT NULL CHECK (status IN ('SUCCESS', 'SKIPPED_ALREADY_EXISTS', 'SKIPPED_SUSPENDED', 'FAILED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_proj_gen_contract_competency UNIQUE (contract_id, competency)
);

CREATE INDEX IF NOT EXISTS idx_pgh_contract ON project_generation_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_pgh_competency ON project_generation_history(competency);

-- 13. RLS e Hardening de Segurança (Hardening 008 compliance)
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_project_recurring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_generation_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON project_templates FROM anon, authenticated;
REVOKE ALL ON project_template_stages FROM anon, authenticated;
REVOKE ALL ON project_template_tasks FROM anon, authenticated;
REVOKE ALL ON projects FROM anon, authenticated;
REVOKE ALL ON project_stages FROM anon, authenticated;
REVOKE ALL ON project_tasks FROM anon, authenticated;
REVOKE ALL ON project_checklists FROM anon, authenticated;
REVOKE ALL ON project_time_entries FROM anon, authenticated;
REVOKE ALL ON contract_project_recurring_settings FROM anon, authenticated;
REVOKE ALL ON project_generation_history FROM anon, authenticated;
REVOKE ALL ON SEQUENCE project_number_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE task_number_seq FROM anon, authenticated;
