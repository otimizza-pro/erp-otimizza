-- Preserve the lead journey and close only system-generated nurture tasks.
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_status_check CHECK (status IN (
 'NEW','CONTACTED','QUALIFIED','CONVERTED','UNQUALIFIED','ARCHIVED',
 'NOVO','QUALIFICANDO','NUTRICAO','QUALIFICADO','OPORTUNIDADE','DESQUALIFICADO','STAND_BY'
));

ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS automation_key TEXT;
CREATE INDEX IF NOT EXISTS idx_crm_activities_nurture_automation ON crm_activities(lead_id, status)
 WHERE automation_key = 'LEAD_NURTURE';

-- Legacy tasks have no origin marker. Require both the generated title and a
-- matching journey event in the same transaction, never identify by title alone.
UPDATE crm_activities a SET automation_key = 'LEAD_NURTURE'
WHERE a.automation_key IS NULL AND a.activity_type = 'FOLLOW_UP'
 AND a.title = 'Retomar lead em nutrição'
 AND EXISTS (
  SELECT 1 FROM crm_lead_status_history h
  WHERE h.lead_id = a.lead_id AND h.to_status = 'NUTRICAO' AND h.created_at = a.created_at
 );

-- Repair already stale tasks while retaining the activity and its audit trail.
UPDATE crm_activities a
SET status = 'COMPLETED', completed_at = COALESCE(a.completed_at, NOW()), updated_at = NOW(),
 outcome_reason = concat_ws(E'\n', NULLIF(a.outcome_reason, ''), 'Conclusão automática: lead já saiu da nutrição (' || l.status || ').')
FROM crm_leads l
WHERE l.id = a.lead_id AND l.status <> 'NUTRICAO'
 AND a.status IN ('PENDING', 'RESCHEDULED') AND a.automation_key = 'LEAD_NURTURE';

CREATE OR REPLACE FUNCTION schedule_crm_nurture_followup() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status <> 'NUTRICAO' THEN
  UPDATE crm_activities SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW(),
   outcome_reason = concat_ws(E'\n', NULLIF(outcome_reason, ''), 'Conclusão automática: lead saiu da nutrição para ' || NEW.status || '.')
  WHERE lead_id = NEW.id AND automation_key = 'LEAD_NURTURE' AND status IN ('PENDING', 'RESCHEDULED');
  RETURN NEW;
 END IF;

 IF NEW.nurture_next_action_date IS NULL THEN
  UPDATE crm_activities SET status = 'CANCELED', updated_at = NOW(),
   outcome_reason = concat_ws(E'\n', NULLIF(outcome_reason, ''), 'Agendamento de nutrição removido do lead.')
  WHERE lead_id = NEW.id AND automation_key = 'LEAD_NURTURE' AND status IN ('PENDING', 'RESCHEDULED');
  RETURN NEW;
 END IF;

 IF OLD.status IS DISTINCT FROM NEW.status
  OR OLD.nurture_next_action_date IS DISTINCT FROM NEW.nurture_next_action_date
  OR OLD.nurture_reason IS DISTINCT FROM NEW.nurture_reason THEN
  -- Reuse the pending task when the date/reason changes, rather than leaving
  -- obsolete reminders behind. A new nurture cycle creates a new activity.
  UPDATE crm_activities SET
   due_date = NEW.nurture_next_action_date::timestamp AT TIME ZONE 'America/Sao_Paulo',
   description = NEW.nurture_reason, updated_at = NOW()
  WHERE lead_id = NEW.id AND automation_key = 'LEAD_NURTURE' AND status IN ('PENDING', 'RESCHEDULED');
  IF NOT FOUND THEN
   INSERT INTO crm_activities(activity_type,title,description,due_date,lead_id,created_by,automation_key)
   VALUES('FOLLOW_UP','Retomar lead em nutrição',NEW.nurture_reason,
    NEW.nurture_next_action_date::timestamp AT TIME ZONE 'America/Sao_Paulo',NEW.id,
    COALESCE(NULLIF(current_setting('app.actor',true),''),'Sistema ERP'),'LEAD_NURTURE');
  END IF;
 END IF;
 RETURN NEW;
END $$;
