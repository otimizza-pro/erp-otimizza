-- Rollback 011: Fase 10 - DRE Gerencial Simplificada e Centros de Custo

DROP TABLE IF EXISTS revenue_accruals CASCADE;
DROP TABLE IF EXISTS financial_cost_center_allocations CASCADE;

ALTER TABLE payables
DROP COLUMN IF EXISTS cost_center_id,
DROP COLUMN IF EXISTS managerial_account_id;

ALTER TABLE financial_categories
DROP COLUMN IF EXISTS managerial_account_id,
DROP COLUMN IF EXISTS default_cost_center_id;

DROP TABLE IF EXISTS managerial_accounts CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP SEQUENCE IF EXISTS cost_center_code_seq;
