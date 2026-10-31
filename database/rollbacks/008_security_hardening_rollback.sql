-- ==============================================================================
-- ROLLBACK DA MIGRAÇÃO 008: RECUPERAÇÃO CONTROLADA
-- ==============================================================================
-- ATENÇÃO: Executar exclusivamente em contingência caso algum serviço dependente
-- do schema public tenha sido afetado.
-- RESTRIÇÃO INEGOCIÁVEL: NÃO RESTAURA POLÍTICAS "ALLOW_ALL" NEM ACESSO ANÔNIMO.
-- ==============================================================================

BEGIN;

-- 1. Remover o registro de execução da migração 008
DELETE FROM _migrations WHERE id = '008_security_hardening';

-- 2. Restaurar apenas permissão de uso de schema para authenticated (caso necessário)
GRANT USAGE ON SCHEMA public TO authenticated;

-- 3. Garantir acesso irrestrito do motor do sistema
GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- NOTA DE SEGURANÇA:
-- Nenhuma política "allow_all" permissiva (USING true) e nenhum privilégio para 'anon'
-- é recriado neste rollback para impedir reintrodução de brechas de vazamento de dados.

COMMIT;
