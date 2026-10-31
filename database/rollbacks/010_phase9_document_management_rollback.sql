-- ==============================================================================
-- OTIMIZZA ERP | ROLLBACK MIGRATION 010: FASE 9 - GESTÃO DOCUMENTAL
-- ==============================================================================

DROP TABLE IF EXISTS document_events CASCADE;
DROP TABLE IF EXISTS document_links CASCADE;
DROP TABLE IF EXISTS document_file_payloads CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_categories CASCADE;
DROP SEQUENCE IF EXISTS document_number_seq CASCADE;
