-- 056_deduplicate_client_audiences.sql
-- Deduplica públicos com nomes equivalentes (case-insensitive) para o mesmo cliente
-- e cria índice único para garantir que nunca mais haja públicos duplicados.

-- 1. Deduplicar registros existentes mantendo o mais recente e completo
DELETE FROM public.client_audiences a
USING public.client_audiences b
WHERE a.client_id = b.client_id
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name))
  AND a.archived_at IS NULL
  AND b.archived_at IS NULL
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

-- 2. Garantir que apenas 1 público seja default por cliente se houver duplicidade
WITH ranked_defaults AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM public.client_audiences
  WHERE is_default = true AND archived_at IS NULL
)
UPDATE public.client_audiences
SET is_default = false
WHERE id IN (
  SELECT id FROM ranked_defaults WHERE rn > 1
);

-- 3. Criar índice único garantindo integridade relacional permanente
CREATE UNIQUE INDEX IF NOT EXISTS client_audiences_unique_name_per_client
ON public.client_audiences (client_id, LOWER(TRIM(name)))
WHERE archived_at IS NULL;
