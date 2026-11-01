-- ==============================================================================
-- Rollback 013: Remoção de Índices de Tuning de Performance
-- ==============================================================================

DROP INDEX IF EXISTS idx_payables_status_due_date;
DROP INDEX IF EXISTS idx_contracts_client_id;
DROP INDEX IF EXISTS idx_contract_versions_expiring;
DROP INDEX IF EXISTS idx_crm_activities_pending_due;
DROP INDEX IF EXISTS idx_crm_leads_status_created;
DROP INDEX IF EXISTS idx_projects_status_due_date;
DROP INDEX IF EXISTS idx_clients_trgm_name;
DROP INDEX IF EXISTS idx_clients_trgm_doc;
DROP INDEX IF EXISTS idx_contracts_trgm_num;
DROP INDEX IF EXISTS idx_proposals_trgm_code;
DROP INDEX IF EXISTS idx_receivables_trgm_num;
DROP INDEX IF EXISTS idx_payables_trgm_num;
DROP INDEX IF EXISTS idx_projects_trgm_num;
