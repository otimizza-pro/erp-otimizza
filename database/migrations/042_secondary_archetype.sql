-- ==============================================================================
-- Migração 042: Suporte a Arquétipo Secundário na Identidade do Cliente
-- ==============================================================================

ALTER TABLE public.client_identities
ADD COLUMN IF NOT EXISTS secondary_archetype VARCHAR(100);
