ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS record_kind VARCHAR(20) NOT NULL DEFAULT 'COMMERCIAL';
ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS chk_crm_activities_target;
ALTER TABLE crm_activities ADD CONSTRAINT chk_crm_activities_target CHECK (
 (record_kind = 'COMMERCIAL' AND (lead_id IS NOT NULL OR client_id IS NOT NULL OR opportunity_id IS NOT NULL))
 OR (record_kind = 'TASK' AND lead_id IS NULL AND client_id IS NULL AND opportunity_id IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_kind_status_due ON crm_activities(record_kind,status,due_date);
