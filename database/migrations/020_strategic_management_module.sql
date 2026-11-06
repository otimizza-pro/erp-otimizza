-- ====================================================================
-- MIGRAÇÃO 020: MÓDULO DE GESTÃO ESTRATÉGICA EMPRESARIAL E MARKETING
-- Tabelas centrais, blocos configuráveis, objetivos, indicadores,
-- orçamentos, ferramentas de gestão, versões e auditoria.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.strategy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'DIAGNOSTICO', 'MARKETING', 'EMPRESARIAL', 'FERRAMENTAS', 'GERAL'
  topic_number INTEGER,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO', -- 'RASCUNHO', 'EM_REVISAO', 'APROVADO', 'ARQUIVADO'
  current_version INTEGER NOT NULL DEFAULT 1,
  responsible_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_documents_cat ON public.strategy_documents(category);
CREATE INDEX IF NOT EXISTS idx_strategy_documents_topic ON public.strategy_documents(topic_number);

CREATE TABLE IF NOT EXISTS public.strategy_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.strategy_documents(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_sections_doc ON public.strategy_sections(document_id, sort_order);

CREATE TABLE IF NOT EXISTS public.strategy_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.strategy_sections(id) ON DELETE CASCADE,
  block_type VARCHAR(50) NOT NULL,
  -- 'TITLE', 'TEXT', 'CALLOUT', 'LIST', 'CHECKLIST', 'NUMBER', 'CURRENCY', 'PERCENT',
  -- 'DATE_RANGE', 'SELECT', 'TABLE', 'LINK', 'INDICATOR_CONNECTED', 'CHART', 'TOOL_FRAMEWORK', 'REFERENCE'
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  classification VARCHAR(30) NOT NULL DEFAULT 'DECLARADO',
  -- 'DECLARADO', 'DECIDIDO', 'HIPOTESE', 'RECOMENDACAO', 'PENDENTE'
  data_nature VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  -- 'MANUAL', 'AUTOMATICO', 'SIMULACAO', 'HISTORICO'
  unit VARCHAR(50),
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_visible_pdf BOOLEAN NOT NULL DEFAULT true,
  responsible_id UUID,
  source_info VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  grid_width INTEGER NOT NULL DEFAULT 12, -- 1 a 12 (colunas responsivas)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_blocks_sec ON public.strategy_blocks(section_id, sort_order);

CREATE TABLE IF NOT EXISTS public.strategy_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'MARKETING', -- 'MARKETING', 'FINANCEIRO', 'COMERCIAL', 'OPERACIONAL', 'EMPRESARIAL'
  goal_type VARCHAR(50) NOT NULL, -- 'MINIMUM', 'MAXIMUM', 'TARGET_RANGE', 'PLANNED_INVESTMENT', 'DEADLINE'
  target_value NUMERIC(15, 2),
  target_range_min NUMERIC(15, 2),
  target_range_max NUMERIC(15, 2),
  unit VARCHAR(50) NOT NULL DEFAULT 'BRL', -- 'BRL', 'PERCENT', 'NUMBER', 'DAYS'
  period_type VARCHAR(30) NOT NULL DEFAULT 'MONTHLY', -- 'MONTHLY', 'QUARTERLY', 'YEARLY', 'HORIZON_90_DAYS', 'ONE_TIME'
  start_date DATE NOT NULL,
  end_date DATE,
  source_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  -- 'FINANCIAL_EXPENSE', 'FINANCIAL_REVENUE', 'CRM_OPPORTUNITIES', 'CRM_LEADS', 'PROJECTS_HOURS', 'MANUAL'
  source_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation_rule VARCHAR(50) NOT NULL DEFAULT 'INVESTMENT_EXECUTION',
  -- 'INVESTMENT_EXECUTION', 'COST_CEILING', 'REVENUE_MINIMUM', 'THRESHOLD_REACHED'
  tolerance_percent NUMERIC(5, 2) DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVA', -- 'ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA'
  responsible_id UUID,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_goals_cat ON public.strategy_goals(category, status);

CREATE TABLE IF NOT EXISTS public.strategy_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_id UUID REFERENCES public.strategy_goals(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PLANEJADA', -- 'PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'
  priority VARCHAR(30) NOT NULL DEFAULT 'MEDIA', -- 'ALTA', 'MEDIA', 'BAIXA'
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  framework_origin VARCHAR(50), -- 'SWOT_STRENGTH', 'SWOT_WEAKNESS', 'CANVAS', '5W2H', 'PDCA'
  framework_ref_id VARCHAR(100),
  responsible_id UUID,
  estimated_cost NUMERIC(15, 2) DEFAULT 0,
  details_5w2h JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_initiatives_goal ON public.strategy_initiatives(goal_id);

CREATE TABLE IF NOT EXISTS public.strategy_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_type VARCHAR(50) NOT NULL,
  -- 'SWOT', 'SWOT_CROSS', 'CANVAS', 'PRIORITIZATION_MATRIX', '5W2H', 'PDCA', 'RISK_MATRIX', 'RACI_MATRIX', 'CAPACITY_ALLOCATION', 'FINANCIAL_SCENARIOS'
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_frameworks_type ON public.strategy_frameworks(framework_type);

CREATE TABLE IF NOT EXISTS public.strategy_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.strategy_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  snapshot JSONB NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_revisions_doc ON public.strategy_revisions(document_id, version_number);

CREATE TABLE IF NOT EXISTS public.strategy_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  author_id UUID,
  author_name VARCHAR(150),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_audit_entity ON public.strategy_audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.strategy_export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.strategy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_export_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_documents' AND policyname = 'authenticated_all_strategy_documents') THEN
    CREATE POLICY authenticated_all_strategy_documents ON public.strategy_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_sections' AND policyname = 'authenticated_all_strategy_sections') THEN
    CREATE POLICY authenticated_all_strategy_sections ON public.strategy_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_blocks' AND policyname = 'authenticated_all_strategy_blocks') THEN
    CREATE POLICY authenticated_all_strategy_blocks ON public.strategy_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_goals' AND policyname = 'authenticated_all_strategy_goals') THEN
    CREATE POLICY authenticated_all_strategy_goals ON public.strategy_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_initiatives' AND policyname = 'authenticated_all_strategy_initiatives') THEN
    CREATE POLICY authenticated_all_strategy_initiatives ON public.strategy_initiatives FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_frameworks' AND policyname = 'authenticated_all_strategy_frameworks') THEN
    CREATE POLICY authenticated_all_strategy_frameworks ON public.strategy_frameworks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_revisions' AND policyname = 'authenticated_all_strategy_revisions') THEN
    CREATE POLICY authenticated_all_strategy_revisions ON public.strategy_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_audit_logs' AND policyname = 'authenticated_all_strategy_audit_logs') THEN
    CREATE POLICY authenticated_all_strategy_audit_logs ON public.strategy_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_export_templates' AND policyname = 'authenticated_all_strategy_export_templates') THEN
    CREATE POLICY authenticated_all_strategy_export_templates ON public.strategy_export_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

