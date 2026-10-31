-- ==============================================================================
-- Rollback da Migração 009: Propostas Comerciais
-- ==============================================================================

ALTER TABLE IF EXISTS contracts DROP COLUMN IF EXISTS proposal_code;
ALTER TABLE IF EXISTS contracts DROP COLUMN IF EXISTS proposal_id;
ALTER TABLE IF EXISTS crm_opportunities DROP CONSTRAINT IF EXISTS fk_crm_opportunities_proposal;

DROP TABLE IF EXISTS proposal_contract_conversions CASCADE;
DROP TABLE IF EXISTS proposal_events CASCADE;
DROP TABLE IF EXISTS proposal_items CASCADE;
DROP TABLE IF EXISTS proposal_versions CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;

DROP SEQUENCE IF EXISTS proposal_number_seq;
