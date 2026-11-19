-- Archiving changes visibility only; never changes billing or historical status.
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_contracts_unarchived_status ON contracts(status) WHERE archived_at IS NULL;
