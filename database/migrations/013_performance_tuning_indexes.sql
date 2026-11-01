-- ==============================================================================
-- Migração 013: Tuning de Performance, Índices Compostos e Aceleração Trigram
-- Objetivo: Otimizar consultas de Dashboard (pendências), Busca Global,
--           Contratos, Financeiro e CRM, reduzindo Seq Scans e contenção no pool.
-- ==============================================================================

-- 1. Extensão pg_trgm para buscas rápidas com ILIKE / substring
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices Compostos para Módulo Financeiro
-- Otimiza listagens e alertas de contas a pagar pendentes por data de vencimento
CREATE INDEX IF NOT EXISTS idx_payables_status_due_date 
  ON payables(status, due_date) 
  WHERE status <> 'CANCELED';

-- 3. Índices de Integridade e Junção para Contratos
-- Acelera joins frequentes entre contracts e clients
CREATE INDEX IF NOT EXISTS idx_contracts_client_id 
  ON contracts(client_id);

-- Acelera detecção de contratos com vigência próxima ao término no dashboard
CREATE INDEX IF NOT EXISTS idx_contract_versions_expiring 
  ON contract_versions(contract_id, end_date) 
  WHERE (NOT is_indefinite AND end_date IS NOT NULL);

-- 4. Índices para CRM e Atividades Comerciais
-- Acelera filtro de atividades comerciais pendentes com alerta de atraso
CREATE INDEX IF NOT EXISTS idx_crm_activities_pending_due 
  ON crm_activities(status, due_date) 
  WHERE status = 'PENDING';

-- Acelera listagem e funil de leads por status e data de criação
CREATE INDEX IF NOT EXISTS idx_crm_leads_status_created 
  ON crm_leads(status, created_at DESC);

-- 5. Índices para Projetos Operacionais
-- Acelera monitoramento de projetos ativos e alertas de prazo
CREATE INDEX IF NOT EXISTS idx_projects_status_due_date 
  ON projects(status, due_date) 
  WHERE status NOT IN ('COMPLETED', 'CANCELED');

-- 6. Índices Trigram (GIN) para Busca Global Instantânea
-- Permite que buscas parciais (ILIKE '%termo%') utilizem index scans em vez de seq scans
CREATE INDEX IF NOT EXISTS idx_clients_trgm_name 
  ON clients USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_trgm_doc 
  ON clients USING gin (document gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contracts_trgm_num 
  ON contracts USING gin (contract_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_proposals_trgm_code 
  ON proposals USING gin (proposal_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_receivables_trgm_num 
  ON receivables USING gin (receivable_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_payables_trgm_num 
  ON payables USING gin (payable_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_trgm_num 
  ON projects USING gin (project_number gin_trgm_ops);
