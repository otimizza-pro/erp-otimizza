-- Correção aditiva: não reescreve as migrations aplicadas 023/024/025.
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_status_check CHECK (status IN
 ('NEW','CONTACTED','QUALIFIED','CONVERTED','UNQUALIFIED','ARCHIVED','NOVO','QUALIFICANDO','NUTRICAO','QUALIFICADO','OPORTUNIDADE','DESQUALIFICADO'));
ALTER TABLE crm_leads ALTER COLUMN acquisition_type SET DEFAULT 'NAO_INFORMADO';
ALTER TABLE crm_leads ALTER COLUMN first_contact_channel DROP DEFAULT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS owner_client_id UUID REFERENCES clients(id);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS acquisition_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS opportunity_created_at TIMESTAMPTZ;
-- A 024 atribuiu defaults a históricos sem prova. Não sobrescrevemos esses valores;
-- os indicadores distinguem os registros ainda não confirmados pelo operador.
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS owner_client_id UUID REFERENCES clients(id);
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS acquisition_snapshot JSONB;
UPDATE crm_opportunities o SET owner_client_id=l.owner_client_id FROM crm_leads l WHERE l.id=o.lead_id AND o.owner_client_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner_created ON crm_leads(owner_client_id,created_at);
CREATE INDEX IF NOT EXISTS idx_crm_opp_owner_closed ON crm_opportunities(owner_client_id,closed_at);
DROP POLICY IF EXISTS allow_all_crm_lead_status_history ON crm_lead_status_history;
ALTER TABLE crm_lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION track_crm_lead_journey() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
  IF NEW.status IN ('QUALIFIED','QUALIFICADO') THEN NEW.qualified_at=COALESCE(NEW.qualified_at,NOW()); END IF;
  IF NEW.status='NUTRICAO' THEN NEW.nurtured_at=NOW(); END IF;
  IF NEW.status IN ('UNQUALIFIED','DESQUALIFICADO') THEN NEW.disqualified_at=NOW(); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION log_crm_lead_journey() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO crm_lead_status_history(lead_id,from_status,to_status,reason,changed_by)
  VALUES(NEW.id,NULL,NEW.status,'Cadastro',COALESCE(NULLIF(current_setting('app.actor',true),''),'Sistema ERP'));
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
  INSERT INTO crm_lead_status_history(lead_id,from_status,to_status,reason,notes,changed_by)
  VALUES(NEW.id,OLD.status,NEW.status,CASE WHEN NEW.status='NUTRICAO' THEN NEW.nurture_reason WHEN NEW.status IN ('DESQUALIFICADO','UNQUALIFIED') THEN NEW.disqualification_reason ELSE 'Mudança de etapa' END,NEW.qualification_notes,COALESCE(NULLIF(current_setting('app.actor',true),''),'Sistema ERP'));
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_lead_journey_dates ON crm_leads;
CREATE TRIGGER crm_lead_journey_dates BEFORE INSERT OR UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION track_crm_lead_journey();
DROP TRIGGER IF EXISTS crm_lead_journey_history ON crm_leads;
CREATE TRIGGER crm_lead_journey_history AFTER INSERT OR UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION log_crm_lead_journey();

CREATE OR REPLACE FUNCTION link_crm_opportunity_journey() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lead crm_leads%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM crm_pipeline_stages WHERE id=NEW.stage_id AND pipeline_id=NEW.pipeline_id AND status='ACTIVE' AND stage_type='NORMAL') THEN
  RAISE EXCEPTION 'Selecione uma etapa inicial ativa do funil informado.';
 END IF;
 IF NEW.lead_id IS NOT NULL THEN
  SELECT * INTO lead FROM crm_leads WHERE id=NEW.lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrado.'; END IF;
  IF lead.status NOT IN ('QUALIFIED','QUALIFICADO','OPORTUNIDADE','CONVERTED') THEN RAISE EXCEPTION 'Qualifique o lead antes de criar uma oportunidade.'; END IF;
  NEW.owner_client_id=lead.owner_client_id;
  NEW.source=COALESCE(lead.lead_source,lead.source);
  NEW.acquisition_snapshot=jsonb_build_object('leadId',lead.id,'acquisitionType',CASE WHEN lead.acquisition_verified THEN lead.acquisition_type ELSE 'NAO_INFORMADO' END,'leadSource',lead.lead_source,'firstContactChannel',CASE WHEN lead.acquisition_verified THEN lead.first_contact_channel ELSE NULL END,'utmSource',lead.utm_source,'utmMedium',lead.utm_medium,'utmCampaign',lead.utm_campaign,'serviceOfInterest',lead.service_of_interest,'qualificationNotes',lead.qualification_notes);
  UPDATE crm_leads SET status=CASE WHEN status='CONVERTED' THEN status ELSE 'OPORTUNIDADE' END, opportunity_created_at=COALESCE(opportunity_created_at,NOW()), updated_at=NOW() WHERE id=lead.id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_opportunity_journey ON crm_opportunities;
CREATE TRIGGER crm_opportunity_journey BEFORE INSERT ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION link_crm_opportunity_journey();

CREATE TABLE IF NOT EXISTS crm_lead_sources(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS crm_lead_sources_name_unique ON crm_lead_sources(lower(btrim(name)));
INSERT INTO crm_lead_sources(name) SELECT name FROM (VALUES('Google Ads'),('Meta Ads'),('Google Orgânico'),('Site'),('Instagram Orgânico'),('Facebook Orgânico'),('Indicação'),('Prospecção via WhatsApp'),('Prospecção via Telefone'),('Prospecção Presencial'),('Prospecção via Instagram'),('Outro')) s(name) ON CONFLICT DO NOTHING;
INSERT INTO crm_lead_sources(name) SELECT DISTINCT btrim(lead_source) FROM crm_leads WHERE NULLIF(btrim(lead_source),'') IS NOT NULL ON CONFLICT DO NOTHING;
ALTER TABLE crm_lead_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS marketing_funnel_plans (
 scope_key TEXT NOT NULL, client_id UUID REFERENCES clients(id), area TEXT NOT NULL,
 start_date DATE NOT NULL,end_date DATE NOT NULL,lead_target INTEGER NOT NULL DEFAULT 0 CHECK(lead_target>=0),budget NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(budget>=0),investment NUMERIC(14,2) CHECK(investment>=0), strategy TEXT NOT NULL DEFAULT '',updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(scope_key,area,start_date,end_date),CHECK(start_date<=end_date),CHECK(scope_key=COALESCE(client_id::text,'otimizza'))
);
ALTER TABLE marketing_funnel_plans ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION schedule_crm_nurture_followup() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='NUTRICAO' AND NEW.nurture_next_action_date IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.nurture_next_action_date IS DISTINCT FROM NEW.nurture_next_action_date) THEN
  INSERT INTO crm_activities(activity_type,title,description,due_date,lead_id,created_by)
  SELECT 'FOLLOW_UP','Retomar lead em nutrição',NEW.nurture_reason,NEW.nurture_next_action_date::timestamp AT TIME ZONE 'America/Sao_Paulo',NEW.id,COALESCE(NULLIF(current_setting('app.actor',true),''),'Sistema ERP')
  WHERE NOT EXISTS(SELECT 1 FROM crm_activities WHERE lead_id=NEW.id AND activity_type='FOLLOW_UP' AND status='PENDING' AND due_date::date=NEW.nurture_next_action_date);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS crm_nurture_followup ON crm_leads;
CREATE TRIGGER crm_nurture_followup AFTER UPDATE ON crm_leads FOR EACH ROW EXECUTE FUNCTION schedule_crm_nurture_followup();
