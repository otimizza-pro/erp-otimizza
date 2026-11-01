-- ==============================================================================
-- MIGRAÇÃO 008: HARDENING DE SEGURANÇA, ISOLAMENTO DE PAPÉIS E FECHAMENTO DE RLS
-- ==============================================================================
-- OBJETIVO:
-- 1. Eliminar a exposição indevida de dados de negócio via Supabase Data API (PostgREST).
-- 2. Revogar privilégios diretos (SELECT, INSERT, UPDATE, DELETE, TRUNCATE) de 'anon' e 'authenticated' em public.
-- 3. Remover políticas RLS abertas (USING true / WITH CHECK true) em fornecedores e CRM.
-- 4. Revogar privilégios padrão futuros para evitar concessão automática em novas tabelas/sequences.
-- 5. Preservar o funcionamento do Supabase Auth e o acesso do Next.js (postgres / service_role).
-- ==============================================================================
-- 0. GARANTIR EXISTÊNCIA DOS PAPÉIS (COMPATIBILIDADE COM DOCKER POSTGRES E CI)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 1. REMOÇÃO DE POLÍTICAS RLS PERMISSIVAS ABERTAS (USING true / WITH CHECK true)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "allow_all_suppliers" ON suppliers;
DROP POLICY IF EXISTS "allow_all_payable_allocations" ON payable_allocations;
DROP POLICY IF EXISTS "allow_all_cost_accruals" ON cost_accruals;
DROP POLICY IF EXISTS "allow_all_crm_leads" ON crm_leads;
DROP POLICY IF EXISTS "allow_all_crm_pipelines" ON crm_pipelines;
DROP POLICY IF EXISTS "allow_all_crm_pipeline_stages" ON crm_pipeline_stages;
DROP POLICY IF EXISTS "allow_all_crm_opportunities" ON crm_opportunities;
DROP POLICY IF EXISTS "allow_all_crm_opp_history" ON crm_opportunity_history;
DROP POLICY IF EXISTS "allow_all_crm_activities" ON crm_activities;

-- ------------------------------------------------------------------------------
-- 2. GARANTIR ROW LEVEL SECURITY ATIVO EM TODAS AS TABELAS DO SCHEMA PUBLIC
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS _migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payable_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_opportunity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_activities ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. REVOGAÇÃO DE PRIVILÉGIOS EXISTENTES EM TABELAS E SEQUENCES (SCHEMA PUBLIC)
-- ------------------------------------------------------------------------------
-- Revogar privilégios em todas as tabelas públicas para os papéis de acesso externo
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Revogar privilégios em todas as sequences públicas
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Revogar execução de rotinas/funções públicas
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Revogar permissão de uso do schema public para o papel anon (bloqueia listagem PostgREST)
REVOKE USAGE ON SCHEMA public FROM anon;

-- ------------------------------------------------------------------------------
-- 4. REVOGAÇÃO DE DEFAULT PRIVILEGES (IMPEDE HERANÇA AUTOMÁTICA EM FUTUROS DDLs)
-- ------------------------------------------------------------------------------
-- Para objetos criados no schema public pela role proprietária (postgres)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. CONFIRMAÇÃO DE ACESSO DO MOTOR DO SISTEMA (POSTGRES / SERVICE_ROLE)
-- ------------------------------------------------------------------------------
-- Garante que o pool de conexão do Next.js (que se conecta com a role postgres/service_role)
-- possua acesso irrestrito às tabelas e sequences para operações do ERP no servidor.
GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;
