-- ==============================================================================
-- Rollback 014: Módulo Informações da Otimizza
-- ==============================================================================

DROP TABLE IF EXISTS public.knowledge_page_files CASCADE;
DROP TABLE IF EXISTS public.knowledge_page_slug_redirects CASCADE;
DROP TABLE IF EXISTS public.knowledge_page_versions CASCADE;
DROP TABLE IF EXISTS public.knowledge_pages CASCADE;
