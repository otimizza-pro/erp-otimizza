-- ==============================================================================
-- OTIMIZZA ERP | MIGRATION 010: FASE 9 - GESTÃO DOCUMENTAL
-- ==============================================================================

-- 1. Sequência para Código do Documento (DOC-00001)
CREATE SEQUENCE IF NOT EXISTS document_number_seq START 1;

-- 2. Tabela de Categorias Documentais
CREATE TABLE IF NOT EXISTS document_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Inserir Categorias Padrão
INSERT INTO document_categories (id, name, description) VALUES
    ('PROPOSAL', 'Proposta Comercial', 'Documentos e PDFs de propostas comerciais emitidas'),
    ('CONTRACT', 'Contrato / Assinatura', 'Instrumentos contratuais e aditivos formalizados'),
    ('REGISTRATION', 'Documento Cadastral', 'Contrato social, cartão CNPJ, comprovantes de endereço e documentos societários'),
    ('RECEIPT', 'Comprovante Financeiro', 'Comprovantes de pagamento, transferências e recibos de liquidação'),
    ('INVOICE', 'Nota Fiscal / Fatura', 'Notas fiscais de serviços e produtos tomados ou emitidos'),
    ('REPORT', 'Relatório / Parecer', 'Relatórios operacionais, técnicos, financeiros ou de BI'),
    ('BRIEFING', 'Briefing Comercial / Operacional', 'Especificações e direcionamentos de campanhas e projetos'),
    ('PROJECT_ASSET', 'Material de Projeto', 'Criativos, assets visuais, guias e entregáveis'),
    ('OTHER', 'Outros', 'Documentos gerais diversos')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 3. Tabela Principal de Documentos (Mestre)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_code VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id VARCHAR(50) NOT NULL REFERENCES document_categories(id) ON DELETE RESTRICT,
    current_version_number INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    issue_date DATE,
    expiration_date DATE,
    created_by VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- 4. Tabela de Versões Imutáveis do Documento
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    version_number INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'SUPABASE_STORAGE' CHECK (storage_provider IN ('SUPABASE_STORAGE', 'DB_STORAGE', 'LOCAL_STORAGE')),
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    reason_for_change TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_version_number UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_sha256 ON document_versions(sha256_hash);

-- 5. Armazenamento Binário Resiliente (para testes, ambiente offline e fallback seguro)
CREATE TABLE IF NOT EXISTS document_file_payloads (
    version_id UUID PRIMARY KEY REFERENCES document_versions(id) ON DELETE CASCADE,
    payload BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Vínculos Polimórficos de Documentos
CREATE TABLE IF NOT EXISTS document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
        'LEAD',
        'OPPORTUNITY',
        'CLIENT',
        'PROPOSAL',
        'PROPOSAL_VERSION',
        'CONTRACT',
        'CONTRACT_VERSION',
        'SUPPLIER',
        'PAYABLE',
        'RECEIVABLE',
        'SETTLEMENT',
        'PROJECT',
        'TASK'
    )),
    entity_id UUID NOT NULL,
    link_type VARCHAR(50) NOT NULL DEFAULT 'ATTACHMENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_entity_link UNIQUE(document_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_links_entity ON document_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_doc_links_document_id ON document_links(document_id);

-- 7. Tabela de Auditoria e Eventos Documentais
CREATE TABLE IF NOT EXISTS document_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID,
    actor_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_events_document_id ON document_events(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_events_created_at ON document_events(created_at);

-- 8. Ativação de RLS e Hardening de Segurança (Compliance com Migration 008)
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_file_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE document_categories FROM anon, authenticated;
REVOKE ALL ON TABLE documents FROM anon, authenticated;
REVOKE ALL ON TABLE document_versions FROM anon, authenticated;
REVOKE ALL ON TABLE document_file_payloads FROM anon, authenticated;
REVOKE ALL ON TABLE document_links FROM anon, authenticated;
REVOKE ALL ON TABLE document_events FROM anon, authenticated;

REVOKE ALL ON SEQUENCE document_number_seq FROM anon, authenticated;
