-- Migration 018: Limpeza de combos e serviços de teste legados
-- Garante que o catálogo comercial em produção contenha exclusivamente os combos oficiais e serviços válidos.

DELETE FROM combos
WHERE name ILIKE '%teste%'
   OR name ILIKE '%aceleracao%'
   OR name ILIKE '%aceleração%';

-- Limpeza de serviços de teste que não possuem vínculos com contratos ou propostas
DELETE FROM services
WHERE (name ILIKE '%teste%' OR name ILIKE '%mock%')
  AND id NOT IN (SELECT service_id FROM contract_items WHERE service_id IS NOT NULL)
  AND id NOT IN (SELECT service_id FROM proposal_items WHERE service_id IS NOT NULL)
  AND id NOT IN (SELECT service_id FROM combo_items WHERE service_id IS NOT NULL);

