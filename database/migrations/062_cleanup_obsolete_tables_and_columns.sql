-- 062_cleanup_obsolete_tables_and_columns.sql
-- Limpeza segura de estruturas obsoletas no Supabase:
-- 1. Remove tabelas sem uso: strategy_export_templates e strategy_revisions
-- 2. Remove colunas experimentais legadas de precificação de domínios (custom_domain_pricing, domain_name, domain_extension)

-- 1. Remoção de tabelas órfãs/obsoletas (0 registros e sem referências na aplicação)
DROP TABLE IF EXISTS public.strategy_export_templates CASCADE;
DROP TABLE IF EXISTS public.strategy_revisions CASCADE;

-- 2. Remoção de colunas legadas não utilizadas
ALTER TABLE public.services DROP COLUMN IF EXISTS custom_domain_pricing;

ALTER TABLE public.contract_items 
  DROP COLUMN IF EXISTS domain_name,
  DROP COLUMN IF EXISTS domain_extension;

ALTER TABLE public.proposal_items 
  DROP COLUMN IF EXISTS domain_name,
  DROP COLUMN IF EXISTS domain_extension;
