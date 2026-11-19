-- Preserve the editorial decisions that produced a saved or planned content item.
ALTER TABLE content_calendar_items ADD COLUMN IF NOT EXISTS editorial_brief JSONB;
