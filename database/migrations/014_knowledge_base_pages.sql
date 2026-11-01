-- ==============================================================================
-- Migração 014: Módulo Informações da Otimizza (Knowledge Base & Estratégia)
-- Objetivo: Manual vivo da estratégia e identidade da Otimizza ERP, com páginas,
--           subpáginas hierárquicas, rascunhos, versionamento, publicação isolada
--           e entrega consolidada para IAs externas.
-- ==============================================================================

-- 0. Garantir Extensão pg_trgm para Busca Trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Tabela Principal de Páginas da Base de Conhecimento
CREATE TABLE IF NOT EXISTS public.knowledge_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NULL REFERENCES public.knowledge_pages(id) ON DELETE RESTRICT,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  info_type VARCHAR(30) NOT NULL DEFAULT 'DIRECTIVE' 
    CHECK (info_type IN ('DIRECTIVE', 'HYPOTHESIS', 'HISTORICAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' 
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  has_unpublished_changes BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_reviewed_at TIMESTAMPTZ NULL,
  next_review_at TIMESTAMPTZ NULL,
  draft_content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  draft_content_html TEXT NOT NULL DEFAULT '<p></p>',
  draft_content_text TEXT NOT NULL DEFAULT '',
  published_content_json JSONB NULL,
  published_content_html TEXT NULL,
  published_content_text TEXT NULL,
  published_at TIMESTAMPTZ NULL,
  published_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  version_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMPTZ NULL
);

-- 2. Tabela de Histórico de Versões
CREATE TABLE IF NOT EXISTS public.knowledge_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.knowledge_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  info_type VARCHAR(30) NOT NULL,
  content_json JSONB NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_published_snapshot BOOLEAN NOT NULL DEFAULT false,
  change_summary TEXT NULL,
  CONSTRAINT uq_knowledge_page_versions_num UNIQUE (page_id, version_number)
);

-- 3. Tabela de Redirecionamento de Slugs Antigos (Preservação de Links)
CREATE TABLE IF NOT EXISTS public.knowledge_page_slug_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.knowledge_pages(id) ON DELETE CASCADE,
  old_slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Anexos e Imagens da Base de Conhecimento
CREATE TABLE IF NOT EXISTS public.knowledge_page_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.knowledge_pages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  payload_base64 TEXT NOT NULL,
  alt_text TEXT NULL,
  caption TEXT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Índices de Performance e Integridade
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_parent ON public.knowledge_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_status ON public.knowledge_pages(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_order ON public.knowledge_pages(parent_id, order_index);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_slug ON public.knowledge_pages(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_info_type ON public.knowledge_pages(info_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_trgm_title ON public.knowledge_pages USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_trgm_draft ON public.knowledge_pages USING gin (draft_content_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_trgm_pub ON public.knowledge_pages USING gin (published_content_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_page_versions_page ON public.knowledge_page_versions(page_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_page_files_page ON public.knowledge_page_files(page_id, is_published);
